pipeline {
    agent any

    tools {
        nodejs 'Node22'
    }

    options {
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        BUILD_TAG = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out code...'
                deleteDir()
                checkout scm
                echo "Build: ${BUILD_TAG}, Commit: ${env.GIT_COMMIT}"
            }
        }

        stage('Prepare Environment') {
            steps {
                echo 'Preparing frontend configuration...'
                writeFile file: '.env', text: """FRONTEND_PORT=3000
API_NETWORK_NAME=docker-jenkins-pipeline_stack
API_HOST_INTERNAL=http://api:3001
"""
            }
        }

        stage('Validate') {
            steps {
                echo 'Validating Docker Compose configuration...'
                sh 'docker compose config --quiet'
            }
        }

        stage('Unit Test') {
            steps {
                echo 'Running Frontend unit tests...'
                sh 'npm ci --include=dev'
                sh 'npm test -- --runInBand'
            }
        }

        stage('Build') {
            steps {
                echo 'Building Frontend...'
                sh 'docker compose build --no-cache frontend'
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploying Frontend using Docker Compose...'
                sh 'docker compose up -d --no-deps --wait --wait-timeout 180 frontend'
            }
        }

        stage('Health Check') {
            steps {
                echo 'Performing health check...'
                sh 'curl -4 -fsS --connect-timeout 3 --max-time 5 -o /dev/null http://127.0.0.1:3000/'
                sh 'curl -4 -fsS --connect-timeout 3 --max-time 5 http://127.0.0.1:3000/api/attractions'
            }
        }

        stage('Verify Deployment') {
            steps {
                echo 'Verifying deployed services...'
                sh 'docker compose ps'
                sh 'docker compose logs --tail=20 frontend'
            }
        }
    }

    post {
        success {
            echo 'Frontend deployment completed successfully!'
            echo "Build: ${BUILD_TAG}, Commit: ${env.GIT_COMMIT}"
        }
        failure {
            echo 'Deployment failed. Printing container logs...'
            sh 'docker compose logs --tail=50 frontend'
        }
    }
}
