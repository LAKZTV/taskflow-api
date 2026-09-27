// Lab 04 - Lab 03 plus branch-gated deploy stages (use with a Multibranch Pipeline job)
pipeline {
  agent { docker { image 'node:20-alpine' } }

  environment {
    APP_NAME = 'taskflow-api'
    NODE_ENV = 'test'
  }

  options {
    // timeout นับรวมเวลารอ input ของ Deploy — Production ด้วย: ต้องกดอนุมัติภายในเวลานี้
    timeout(time: 30, unit: 'MINUTES')
  }

  stages {
    stage('Install')   { steps { sh 'npm ci' } }
    stage('Lint')      { steps { sh 'npm run lint:ci' } }
    stage('Unit Test') { steps { sh 'npm test' } }

    stage('Deploy — Staging') {
      when { branch 'develop' }
      steps { sh 'echo deploying to staging...' }
    }
    stage('Deploy — Production') {
      when { branch 'main' }
      input { message 'Deploy to production?' }
      steps { sh 'echo deploying to production...' }
    }
  }

  post {
    success { echo "✅ ${env.APP_NAME} passed on ${env.NODE_ENV}" }
    failure { echo "❌ Failed at stage: ${env.STAGE_NAME}" }
    always  { archiveArtifacts artifacts: 'npm-debug.log*', allowEmptyArchive: true }
  }
}
