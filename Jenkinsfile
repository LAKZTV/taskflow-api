// Lab 03 - first declarative pipeline (Install, Lint, Unit Test) running in a Docker agent
pipeline {
  agent { docker { image 'node:20-alpine' } }

  environment {
    APP_NAME = 'taskflow-api'
    NODE_ENV = 'test'
  }

  options {
    // ทุก pipeline ต้องมีเพดานเวลา: npm install ที่ค้างเพราะเน็ต/registry ล่ม หรือเทสต์ที่วนไม่จบ
    // จะยึด executor ไว้ตลอดไป งานอื่นในคิวก็ต้องรอ (และในคลาวด์ก็เสียเงินเปล่า ๆ)
    // timeout ทำให้ build "ล้มเร็วและดัง" แทนที่จะ "ค้างเงียบ ๆ"
    timeout(time: 10, unit: 'MINUTES')
  }

  stages {
    stage('Install')   { steps { sh 'npm ci' } }
    stage('Lint')      { steps { sh 'npm run lint:ci' } }   // ไม่ใช้ npm run lint เพราะมี --fix
    stage('Unit Test') { steps { sh 'npm test' } }
  }

  post {
    success { echo "✅ ${env.APP_NAME} passed on ${env.NODE_ENV}" }
    failure { echo "❌ Failed at stage: ${env.STAGE_NAME}" }
    always  { archiveArtifacts artifacts: 'npm-debug.log*', allowEmptyArchive: true }
  }
}
