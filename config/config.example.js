
var path = require('path')
  , rootPath = path.normalize(__dirname + '/..')
  , templatePath = path.normalize(__dirname + '/../app/mailer/templates')
  , notifier = {
      service: 'postmark',
      APN: false,
      email: false, // true
      actions: ['comment'],
      tplPath: templatePath,
      key: 'POSTMARK_KEY',
      parseAppId: 'PARSE_APP_ID',
      parseApiKey: 'PARSE_MASTER_KEY'
    }

module.exports = {
  development: {
    db: 'mongodb://localhost/lov',
    es: {
      host: 'localhost',
      port: 9200,
    },
    lov: 'http://localhost:3333',
    //Path to where the output of "lov_scripts" repository have been generated
    scripts: '/home/sergio/scripts',
    //Path to "Patrones" repository
    patterns: '/home/user/Patterns/Patrones',
    //Path to python environment
    python_patterns: '/home/user/Patterns/env/bin/python',
    app_name: 'Example Application Name',
    app_name_shorcut: 'EAN',
    root: rootPath,
    notifier: notifier,
    email: {
      service: 'Gmail',
      auth: {
          user: 'user@gmail.com',
          pass: 'pwd'
      }
    }
  },
  test: {
    db: 'mongodb://localhost/lov',
    es: {host: 'localhost',port: 9200},
    email: {
      service: 'Gmail',
      auth: {
          user: 'user@gmail.com',
          pass: 'pwd'
      }
    }
  },
  production: {
    db: 'mongodb://localhost/lov',
    es: {
      host: 'localhost',
      port: 9200,
    },
    lov: 'http://localhost:3333',
    //Path to where the output of "lov_scripts" repository have been generated
    scripts: '/home/sergio/scripts',
    //Path to "Patrones" repository
    patterns: '/home/user/Patterns/Patrones',
    //Path to python environment
    python_patterns: '/home/user/Patterns/env/bin/python',
    app_name: 'Example Application Name',
    app_name_shorcut: 'EAN',
    root: rootPath,
    notifier: notifier,
    email: {
      service: 'Gmail',
      auth: {
          user: 'user@gmail.com',
          pass: 'pwd'
      }
    }
  }
}
