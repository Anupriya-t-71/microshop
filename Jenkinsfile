pipeline {
  agent any

  parameters {
    string(name: 'REGISTRY', defaultValue: 'your-dockerhub-username', description: 'Docker registry user/org')
    choice(name: 'DEPLOY_TARGET', choices: ['kubernetes', 'docker-compose'], description: 'Where to deploy')
  }

  environment {
    TAG = "${env.BUILD_NUMBER}"
    // Jenkins credentials you must create (Manage Jenkins > Credentials):
    //   dockerhub-creds : Username with password
    //   kubeconfig      : Secret file (your cluster kubeconfig)
  }

  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 40, unit: 'MINUTES')
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build Images') {
      when { expression { params.DEPLOY_TARGET == 'kubernetes' } }
      steps {
        sh '''
          set -e
          for dir in services/*/; do
            svc=$(basename "$dir")
            echo ">> building $svc"
            docker build -q -t "$REGISTRY/microshop-$svc:$TAG" "$dir"
          done
        '''
      }
    }

    stage('Push Images') {
      when { expression { params.DEPLOY_TARGET == 'kubernetes' } }
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh '''
            set -e
            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
            for dir in services/*/; do
              svc=$(basename "$dir")
              docker push "$REGISTRY/microshop-$svc:$TAG"
            done
          '''
        }
      }
    }

    stage('Deploy to Kubernetes') {
      when { expression { params.DEPLOY_TARGET == 'kubernetes' } }
      steps {
        withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
          sh '''
            set -e
            rm -rf k8s-build && cp -r k8s k8s-build
            sed -i "s#image: microshop/\\(.*\\):1.0.0#image: $REGISTRY/microshop-\\1:$TAG#" k8s-build/services/*.yaml
            kubectl apply -k k8s-build
            kubectl -n microshop wait --for=condition=available deployment --all --timeout=300s
            kubectl -n microshop get pods
          '''
        }
      }
    }

    stage('Deploy with Docker Compose') {
      when { expression { params.DEPLOY_TARGET == 'docker-compose' } }
      steps {
        sh '''
          set -e
          docker compose up -d --build
          sleep 10
          curl -sf http://localhost:8080/api/status
        '''
      }
    }
  }

  post {
    success { echo "Deployed build ${env.BUILD_NUMBER} to ${params.DEPLOY_TARGET}" }
    failure { echo 'Deployment failed - check the stage logs above.' }
    always  { sh 'docker logout || true' }
  }
}
