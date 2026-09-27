// Lab 05 - JUnit + coverage, SonarQube quality gate, Playwright E2E
pipeline {
  agent { label 'built-in' }

  environment {
    APP_NAME = 'taskflow-api'
    NODE_ENV = 'test'
  }

  options {
    timeout(time: 30, unit: 'MINUTES')   // เพิ่มจาก 10 เพราะมี Sonar + E2E + รออนุมัติ production
  }

  stages {
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
              // ถ้า plugin ของคุณเป็น Code Coverage API (ตามโจทย์) ใช้แทน:
              // publishCoverage adapters: [coberturaAdapter('coverage/cobertura-coverage.xml')]
            }
          }
        }
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
        // schema ว่างจนกว่าจะ migrate (ไม่มี migrationsRun) — รันจาก dist/ จึงไม่ต้องพึ่ง ts-node
        sh 'docker compose -p taskflow-e2e exec -T api npx typeorm migration:run -d dist/config/data-source.js'
        sh 'docker compose -p taskflow-e2e exec -T api node dist/database/seed-rooms.js'
      }
    }

    stage('E2E — Playwright') {
      agent {
        docker {
          image 'mcr.microsoft.com/playwright:v1.63.0-noble'   // ให้ตรงกับเวอร์ชัน @playwright/test
          args '--network taskflow-e2e_default'                // คุยกับ API ผ่าน network ของ compose
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
      // ปิด stack ทดสอบเสมอ แม้ pipeline ล้ม
      sh 'docker compose -p taskflow-e2e down -v || true'
      sh 'rm -f .env'
    }
    success { echo "✅ ${env.APP_NAME} passed on ${env.NODE_ENV}" }
    failure { echo "❌ Failed at stage: ${env.STAGE_NAME}" }
  }
}
