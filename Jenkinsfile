// Jenkinsfile — taskflow-api  (Lab 10: รวม Lab 03–09)

def notify(String status) {
  def color = (status == 'SUCCESS') ? 'good' : 'danger'
  def msg   = "${status}: ${env.JOB_NAME} #${env.BUILD_NUMBER} (branch ${env.BRANCH_NAME}) ${env.BUILD_URL}"
  try {
    slackSend(channel: '#ci', color: color, message: msg)
  } catch (err) {
    echo "Slack notification failed (${err}) — falling back to email"
    mail(to: 'team@example.com', subject: "[Jenkins] ${status} ${env.JOB_NAME}", body: msg)
  }
}

pipeline {
  agent none

  options {
    timeout(time: 60, unit: 'MINUTES')
    timestamps()
  }

  parameters {
    string(name: 'HEALTH_MIN', defaultValue: '0.90', description: 'success rate ต่ำสุดที่ยอมให้ deploy production')
    booleanParam(name: 'INJECT_BROKEN_IMAGE', defaultValue: false, description: 'เดโม: deploy image ที่พังเพื่อพิสูจน์ rollback')
  }

  environment {
    APP_NAME = 'taskflow-api'
    NODE_ENV = 'test'
    REGISTRY = 'registry:5000'
  }

  stages {

    stage('CI') {
      agent { kubernetes { yamlFile 'ci/pod.yaml'; defaultContainer 'node' } }
      stages {

        stage('Secrets Detection') {
          steps {
            container('gitleaks') {
              sh '''
                git config --global --add safe.directory '*'
                gitleaks detect --source . --no-banner --redact --log-opts="--full-history" \
                  --report-format json --report-path gitleaks-report.json --exit-code 1
              '''
            }
          }
          post { always { archiveArtifacts artifacts: 'gitleaks-report.json', allowEmptyArchive: true } }
        }

        stage('Install') { steps { sh 'npm ci' } }

        // งานที่ไม่ขึ้นต่อกัน รันขนานกัน — ตัวใดตัวหนึ่งล้ม ตัวอื่นหยุดทันที (failFast)
        stage('Checks in parallel') {
          failFast true
          parallel {
            stage('Lint') { steps { sh 'npm run lint:ci' } }

            stage('Unit Test + Coverage') {
              steps { sh 'npm run test:ci' }
              post {
                always {
                  junit 'reports/junit.xml'
                  recordCoverage(tools: [[parser: 'COBERTURA', pattern: 'coverage/cobertura-coverage.xml']])
                }
              }
            }

            stage('SAST') {
              steps {
                sh 'npx eslint "{src,test}/**/*.ts" -f @microsoft/eslint-formatter-sarif -o eslint.sarif'
                container('semgrep') {
                  sh 'semgrep scan --config=p/owasp-top-ten --config=p/nodejs --sarif --output semgrep.sarif src/'
                }
              }
              post { always { archiveArtifacts artifacts: '*.sarif', allowEmptyArchive: true } }
            }

            stage('SCA') {
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
                  }
                }
              }
              post { always { archiveArtifacts artifacts: 'audit.json', allowEmptyArchive: true } }
            }
          }
        }

        stage('SBOM + Policy') {
          steps {
            container('docker') {
              sh 'docker run --rm -v "$PWD":/w -w /w anchore/syft:latest dir:. -o cyclonedx-json=taskflow-api.cdx.json'
              withCredentials([file(credentialsId: 'cosign-key', variable: 'COSIGN_KEY'),
                               string(credentialsId: 'cosign-password', variable: 'COSIGN_PASSWORD')]) {
                sh '''
                  docker run --rm -u 0:0 -v "$PWD":/w -v "$COSIGN_KEY":/cosign.key:ro -w /w -e COSIGN_PASSWORD \
                    gcr.io/projectsigstore/cosign:v2.4.1 sign-blob --yes --tlog-upload=false \
                    --key /cosign.key --output-signature taskflow-api.cdx.json.sig taskflow-api.cdx.json
                '''
                // cosign image is distroless (no shell, so the chmod above can't run inside it) -
                // fix up ownership from here instead so archiveArtifacts (running as the jenkins user) can read the files
                sh 'chmod 644 taskflow-api.cdx.json taskflow-api.cdx.json.sig'
              }
              sh '''
                docker run --rm -v "$PWD":/w -w /w openpolicyagent/opa:latest eval --fail-defined \
                  --format pretty --input audit.json --data policy/security.rego "data.security.deny[_]"
              '''
            }
          }
          post { always { archiveArtifacts artifacts: 'taskflow-api.cdx.json,taskflow-api.cdx.json.sig', allowEmptyArchive: true } }
        }

        stage('SonarQube') {
          steps {
            container('sonar') {
              withSonarQubeEnv('SonarQube') { sh 'sonar-scanner -Dsonar.projectKey=taskflow-api' }
            }
            timeout(time: 5, unit: 'MINUTES') { waitForQualityGate abortPipeline: true }
          }
        }

        // ขึ้นต่อกันเป็นลำดับ: build → scan → push (push หลังผ่านการสแกนเท่านั้น ดีกว่า Lab 07)
        stage('Build → Scan → Push image') {
          steps {
            script { env.IMAGE_TAG = env.GIT_COMMIT.take(7) }
            container('docker') {
              sh 'docker build --build-arg GIT_COMMIT=$IMAGE_TAG -t $REGISTRY/taskflow-api:$IMAGE_TAG .'
            }
            container('trivy') {
              sh 'trivy image --image-src docker --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed $REGISTRY/taskflow-api:$IMAGE_TAG'
            }
            container('docker') {
              sh 'docker push $REGISTRY/taskflow-api:$IMAGE_TAG'
            }
          }
        }

        stage('E2E') {
          steps {
            container('docker') {
              sh '''
                cp .env.ci .env
                docker compose -p e2e up -d --build --wait
                docker compose -p e2e exec -T api node_modules/.bin/typeorm migration:run -d dist/config/data-source.js
                docker compose -p e2e exec -T api node dist/database/seed-rooms.js
              '''
            }
            container('playwright') {
              sh 'npm ci --ignore-scripts && BASE_URL=http://localhost:3000 npx playwright test -c test/playwright'
            }
          }
          post {
            always {
              container('docker') { sh 'docker compose -p e2e down -v || true' }
              junit allowEmptyResults: true, testResults: 'reports/e2e-junit.xml'
              archiveArtifacts artifacts: 'playwright-report/**', allowEmptyArchive: true
            }
          }
        }
      }
    }

    stage('Deploy — Staging') {
      when { branch 'develop' }
      steps { echo 'deploying to staging...' }
    }

    stage('Pipeline Health Gate') {
      when { branch 'main' }
      agent { kubernetes { yamlFile 'ci/pod-tools.yaml'; defaultContainer 'tools' } }
      steps {
        // ถามข้อมูลสุขภาพของ pipeline จาก Prometheus ของ Lab 09 — ถ้าสัดส่วน build สำเร็จต่ำกว่าเกณฑ์ ไม่ปล่อย production
        sh '''
          Q='sum(increase(default_jenkins_builds_success_build_count[6h])) / sum(increase(default_jenkins_builds_total_build_count[6h]))'
          RATE=$(curl -sG "http://prometheus:9090/api/v1/query" --data-urlencode "query=$Q" \
                 | jq -r '(.data.result[0].value[1] // "1") | if . == "NaN" then "1" else . end')
          echo "pipeline success rate = $RATE (minimum $HEALTH_MIN)"
          awk -v r="$RATE" -v m="$HEALTH_MIN" 'BEGIN { exit ((r+0 < m+0) ? 1 : 0) }' \
            || { echo "HEALTH GATE: success rate $RATE is below $HEALTH_MIN - aborting the production deploy"; exit 1; }
        '''
      }
    }

    stage('Approve production') {
      when {
        branch 'main'
        beforeInput true   // เช็ก branch ก่อนถาม input — ไม่งั้นถามทุก branch (ค่า default ของ Jenkins)
      }
      steps { input message: 'Deploy to production?' }
    }

    stage('Deploy — Production (blue/green)') {
      when { branch 'main' }
      agent { kubernetes { yamlFile 'ci/pod-tools.yaml'; defaultContainer 'tools' } }
      steps {
        script {
          def current = sh(script: "kubectl get svc taskflow -n default -o jsonpath='{.spec.selector.color}'", returnStdout: true).trim()
          def next    = (current == 'blue') ? 'green' : 'blue'
          env.PREV_COLOR = current
          def image = params.INJECT_BROKEN_IMAGE ? "${env.REGISTRY}/taskflow-api:broken" : "${env.REGISTRY}/taskflow-api:${env.IMAGE_TAG}"

          sh "kubectl set image deployment/taskflow-${next} -n default app=${image}"
          sh "kubectl rollout status deployment/taskflow-${next} -n default --timeout=90s"
          def out = sh(script: "kubectl run smoke-${env.BUILD_NUMBER} -n default --rm -i --restart=Never --image=curlimages/curl -- curl -sf http://taskflow-${next}:3000/api/health/version", returnStdout: true)
          if (!out.contains(env.IMAGE_TAG)) { error("Smoke test: taskflow-${next} is not serving commit ${env.IMAGE_TAG}: ${out}") }
          sh "kubectl patch svc taskflow -n default -p '{\"spec\":{\"selector\":{\"color\":\"${next}\"}}}'"
          echo "Switched traffic from ${current} to ${next}"
        }
      }
      post {
        failure {
          sh """
            if [ -n "${env.PREV_COLOR}" ] && [ "${env.PREV_COLOR}" != "null" ]; then
              kubectl patch svc taskflow -n default -p '{"spec":{"selector":{"color":"${env.PREV_COLOR}"}}}'
              echo "ROLLBACK: traffic pinned back to ${env.PREV_COLOR}"
            fi
          """
        }
      }
    }
  }

  post {
    success { script { notify('SUCCESS') } }
    failure { script { notify('FAILURE') } }
  }
}
