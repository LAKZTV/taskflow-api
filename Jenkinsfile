// Lab 07 - Lab 06 plus: versioned image build, Trivy gate, blue/green deploy to kind with automatic rollback
pipeline {
  agent { label 'built-in' }

  parameters {
    booleanParam(name: 'INJECT_BROKEN_IMAGE', defaultValue: false,
                 description: 'Lab 07: deploy an image that crashes on start, to prove the automatic rollback')
  }

  environment {
    APP_NAME = 'taskflow-api'
    NODE_ENV = 'test'
  }

  options {
    timeout(time: 45, unit: 'MINUTES')
  }

  stages {
    stage('Secrets Detection') {
      steps {
        sh '''
          docker run --rm --volumes-from jenkins -w "$WORKSPACE" \
            zricethezav/gitleaks:latest detect --source . --no-banner --redact \
            --log-opts="--full-history" \
            --report-format json --report-path gitleaks-report.json --exit-code 1
        '''
      }
      post { always { archiveArtifacts artifacts: 'gitleaks-report.json', allowEmptyArchive: true } }
    }

    stage('Node checks') {
      agent { docker { image 'node:20-alpine'; reuseNode true } }
      stages {
        stage('Install')   { steps { sh 'npm ci' } }
        stage('Lint')      { steps { sh 'npm run lint:ci' } }
        stage('Unit Test') {
          steps { sh 'npm run test:ci' }
          post {
            always {
              junit 'reports/junit.xml'
              recordCoverage(tools: [[parser: 'COBERTURA', pattern: 'coverage/cobertura-coverage.xml']])
            }
          }
        }
      }
    }

    stage('SAST — ESLint security') {
      agent { docker { image 'node:20-alpine'; reuseNode true } }
      steps { sh 'npx eslint "{src,test}/**/*.ts" -f @microsoft/eslint-formatter-sarif -o eslint.sarif' }
      post { always { archiveArtifacts artifacts: 'eslint.sarif', allowEmptyArchive: true } }
    }

    stage('SAST — Semgrep') {
      steps {
        sh '''
          docker run --rm --volumes-from jenkins -w "$WORKSPACE" \
            semgrep/semgrep:latest semgrep scan \
            --config=p/owasp-top-ten --config=p/nodejs \
            --sarif --output semgrep.sarif src/
        '''
      }
      post { always { archiveArtifacts artifacts: 'semgrep.sarif', allowEmptyArchive: true } }
    }

    stage('SCA — npm audit') {
      agent { docker { image 'node:20-alpine'; reuseNode true } }
      steps {
        script {
          sh 'npm audit --audit-level=high --json > audit.json || true'
          def critical = sh(script: "node -p \"require('./audit.json').metadata.vulnerabilities.critical\"", returnStdout: true).trim().toInteger()
          def high     = sh(script: "node -p \"require('./audit.json').metadata.vulnerabilities.high\"", returnStdout: true).trim().toInteger()
          if (critical > 0) {
            catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
              error("Blocking: ${critical} critical vulnerabilities found")
            }
          } else if (high > 0) {
            unstable("Warning: ${high} high vulnerabilities (not blocking)")
          } else {
            echo "SCA passed with 0 critical vulnerabilities (warnings allowed)"
          }
        }
      }
      post { always { archiveArtifacts artifacts: 'audit.json', allowEmptyArchive: true } }
    }

    stage('Generate SBOM') {
      steps {
        sh '''
          docker run --rm --volumes-from jenkins -w "$WORKSPACE" \
            anchore/syft:latest dir:. -o cyclonedx-json=taskflow-api.cdx.json
        '''
        withCredentials([file(credentialsId: 'cosign-key', variable: 'COSIGN_KEY'),
                         string(credentialsId: 'cosign-password', variable: 'COSIGN_PASSWORD')]) {
          sh '''
            docker run --rm -u 0:0 --volumes-from jenkins -w "$WORKSPACE" -e COSIGN_PASSWORD \
              gcr.io/projectsigstore/cosign:v2.4.1 sign-blob --yes --tlog-upload=false \
              --key "$COSIGN_KEY" --output-signature taskflow-api.cdx.json.sig taskflow-api.cdx.json
          '''
        }
      }
      post { always { archiveArtifacts artifacts: 'taskflow-api.cdx.json,taskflow-api.cdx.json.sig', allowEmptyArchive: true } }
    }

    stage('Policy Gate') {
      steps {
        sh '''
          docker run --rm --volumes-from jenkins -w "$WORKSPACE" \
            openpolicyagent/opa:latest eval --fail-defined --format pretty \
            --input audit.json --data policy/security.rego "data.security.deny[_]"
        '''
      }
    }

    stage('SonarQube Analysis') {
      agent { docker { image 'sonarsource/sonar-scanner-cli:latest'; args '--entrypoint='; reuseNode true } }
      steps {
        withSonarQubeEnv('SonarQube') {
          sh 'sonar-scanner -Dsonar.projectKey=taskflow-api'
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('E2E — start API') {
      steps {
        sh 'cp .env.ci .env'
        sh 'docker compose -p taskflow-e2e -f docker-compose.yml -f docker-compose.ci.yml up -d --build --wait'
        sh 'docker compose -p taskflow-e2e exec -T api npx typeorm migration:run -d dist/config/data-source.js'
        sh 'docker compose -p taskflow-e2e exec -T api node dist/database/seed-rooms.js'
      }
    }

    stage('E2E — Playwright') {
      agent {
        docker {
          image 'mcr.microsoft.com/playwright:v1.63.0-noble'
          args '--network taskflow-e2e_default'
          reuseNode true
        }
      }
      environment { BASE_URL = 'http://api:3000' }
      steps {
        sh 'npm ci --ignore-scripts'
        sh 'npx playwright test -c test/playwright'
      }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'reports/e2e-junit.xml'
          archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
          publishHTML(target: [
            reportDir: 'playwright-report', reportFiles: 'index.html',
            reportName: 'Playwright Report', keepAll: true,
            allowMissing: true, alwaysLinkToLastBuild: true
          ])
        }
      }
    }

    stage('Build Image') {
      steps {
        script { env.IMAGE_TAG = env.GIT_COMMIT.take(7) }        // tag ไม่เปลี่ยนแปลง ผูกกับ commit — ห้าม latest
        sh '''
          docker build --build-arg GIT_COMMIT=$IMAGE_TAG \
            -t taskflow-api:$IMAGE_TAG -t localhost:5000/taskflow-api:$IMAGE_TAG .
          docker push localhost:5000/taskflow-api:$IMAGE_TAG
        '''
      }
    }

    stage('Container Scan') {
      steps {
        // (1) รายงาน SARIF เสมอ (exit 0)  (2) แล้วค่อย gate: exit 1 เมื่อเจอ HIGH/CRITICAL และพิมพ์ตารางใน console
        sh '''
          T="docker run --rm -v trivy-cache:/root/.cache -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest"
          docker run --rm --volumes-from jenkins -w "$WORKSPACE" -v trivy-cache:/root/.cache \
            -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image \
            --severity HIGH,CRITICAL --ignore-unfixed --format sarif -o trivy.sarif taskflow-api:$IMAGE_TAG
          $T image --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed --format table taskflow-api:$IMAGE_TAG
        '''
      }
      post { always { archiveArtifacts artifacts: 'trivy.sarif', allowEmptyArchive: true } }
    }

    stage('Deploy — Staging') {
      when { branch 'develop' }
      steps { sh 'echo deploying to staging...' }
    }

    stage('Blue/Green Deploy') {
      when {
        branch 'main'
        beforeInput true   // เช็ก branch ก่อนถาม input — ไม่งั้นถามทุก branch (ค่า default ของ Jenkins)
      }
      input { message 'Deploy to production?' }
      steps {
        withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
          script {
            def current = sh(script: "kubectl get svc taskflow -o jsonpath='{.spec.selector.color}'", returnStdout: true).trim()
            def next = (current == 'blue') ? 'green' : 'blue'
            env.PREV_COLOR = current
            def image = params.INJECT_BROKEN_IMAGE ? 'taskflow-api:broken' : "taskflow-api:${env.IMAGE_TAG}"

            sh "kind load docker-image ${image} --name taskflow"
            sh "kubectl set image deployment/taskflow-${next} app=${image}"
            sh "kubectl rollout status deployment/taskflow-${next} --timeout=90s"

            // smoke test pod ใหม่ตรง ๆ (ข้าม Service หลัก) และตรวจว่าเป็น "เวอร์ชันใหม่" จริง ผ่าน /api/health/version
            def out = sh(script: "kubectl run smoke-${env.BUILD_NUMBER} --rm -i --restart=Never --image=curlimages/curl -- curl -sf http://taskflow-${next}:3000/api/health/version", returnStdout: true)
            if (!params.INJECT_BROKEN_IMAGE && !out.contains(env.IMAGE_TAG)) {
              error("Smoke test: taskflow-${next} is not serving commit ${env.IMAGE_TAG}: ${out}")
            }

            sh "kubectl patch svc taskflow -p '{\"spec\":{\"selector\":{\"color\":\"${next}\"}}}'"
            echo "Switched traffic from ${current} to ${next}"
          }
        }
      }
      post {
        failure {
          // rollback อัตโนมัติ: ชี้ Service กลับสีเดิม (ไม่ redeploy อะไรทั้งนั้น — แค่แก้ label selector)
          withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
            sh """
              if [ -n "${env.PREV_COLOR}" ] && [ "${env.PREV_COLOR}" != "null" ]; then
                kubectl patch svc taskflow -p '{"spec":{"selector":{"color":"${env.PREV_COLOR}"}}}'
                echo "ROLLBACK: traffic pinned back to ${env.PREV_COLOR}"
              fi
            """
          }
        }
      }
    }
  }

  post {
    always {
      sh 'docker compose -p taskflow-e2e down -v || true'
      sh 'rm -f .env'
    }
    success { echo "✅ ${env.APP_NAME} passed on ${env.NODE_ENV}" }
    failure { echo "❌ Failed at stage: ${env.STAGE_NAME}" }
  }
}
