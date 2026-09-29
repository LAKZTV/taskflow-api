// Lab 06 - shift-left security: Secrets -> SAST -> SCA -> SBOM -> Policy, then the Lab 05 gates
// Tools run through `docker run --volumes-from jenkins` so they see the same workspace path.
pipeline {
  agent { label 'built-in' }

  environment {
    APP_NAME = 'taskflow-api'
    NODE_ENV = 'test'
  }

  options {
    timeout(time: 40, unit: 'MINUTES')
  }

  stages {
    stage('Secrets Detection') {
      steps {
        // --log-opts="--full-history" = สแกนเฉพาะประวัติของ branch ที่กำลัง build
        // (ค่าเริ่มต้นสแกน "ทุก ref" → คีย์ที่รั่วบน scratch branch จะทำให้ main แดงไปด้วย)
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
          // ใช้ node อ่าน JSON แทน jq (node:20-alpine ไม่มี jq)
          def critical = sh(script: "node -p \"require('./audit.json').metadata.vulnerabilities.critical\"", returnStdout: true).trim().toInteger()
          def high     = sh(script: "node -p \"require('./audit.json').metadata.vulnerabilities.high\"", returnStdout: true).trim().toInteger()
          if (critical > 0) {
            // catchError: stage + build เป็น FAILURE แต่ pipeline วิ่งต่อถึง Policy Gate
            // เพื่อให้เห็นทั้งสอง gate ทำงานบนข้อมูลชุดเดียวกัน
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
            docker run --rm --volumes-from jenkins -w "$WORKSPACE" -e COSIGN_PASSWORD \
              gcr.io/projectsigstore/cosign:v2.4.1 sign-blob --yes --tlog-upload=false \
              --key "$COSIGN_KEY" --output-signature taskflow-api.cdx.json.sig taskflow-api.cdx.json
          '''
        }
      }
      post { always { archiveArtifacts artifacts: 'taskflow-api.cdx.json,taskflow-api.cdx.json.sig', allowEmptyArchive: true } }
    }

    stage('Policy Gate') {
      steps {
        // --fail-defined: ถ้า deny มีสมาชิกแม้ 1 ตัว → exit code 1 → stage ล้ม
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

    stage('Deploy — Staging') {
      when { branch 'develop' }
      steps { sh 'echo deploying to staging...' }
    }
    stage('Deploy — Production') {
      when {
        branch 'main'
        beforeInput true   // เช็ก branch ก่อนถาม input — ไม่งั้นถามทุก branch (ค่า default ของ Jenkins)
      }
      input { message 'Deploy to production?' }
      steps { sh 'echo deploying to production...' }
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
