const gulp_util = require('gulp-util');
const through2 = require('through2');
const fs = require('fs');
const path = require('path');

const gulp = require('gulp');
const gulp_sass = require('gulp-sass');
const gulp_clean_css = require('gulp-clean-css');
const gulp_typescript = require('gulp-typescript');
const typescript = require('typescript');

const JSON_FILES = ['src/*.json', 'src/**/*.json'];
const tsProject = gulp_typescript.createProject('tsconfig.json');
const showLogs = require('yargs').argv.logs;

gulp.task('css', () => {
    gulp.src('../client/src/styles.scss')
        .pipe(gulp_sass({ style: 'expanded' }))
        .pipe(gulp_clean_css())
        .pipe(gulp.dest('../client/dist'));
});

gulp.task('sharedClasses', () => {
    // copy shared base to server
    gulp.src('../node_modules/Radar-shared/classes/sharedBase.ts')
        .pipe(gulp.dest('../server/src/classes'));

    // copy shared base to client
    gulp.src('../node_modules/Radar-shared/classes/sharedBase.ts')
        .pipe(gulp.dest('../client/src/app/classes'));

    // copy shared events to server
    gulp.src('../node_modules/Radar-shared/classes/sharedEvents.ts')
        .pipe(gulp.dest('../server/src/classes'));

    // copy shared events to client
    gulp.src('../node_modules/Radar-shared/classes/sharedEvents.ts')
        .pipe(gulp.dest('../client/src/app/classes'));

    // copy component classes to server
    gulp.src('../node_modules/Radar-shared/classes/components.ts')
        .pipe(gulp.dest('../server/src/classes'));

    // copy component classes to client
    gulp.src('../node_modules/Radar-shared/classes/components.ts')
        .pipe(gulp.dest('../client/src/app/classes'));
});

// turn all relative paths into absolute paths
gulp.task('transpilePaths', [/*'scripts', */'css', 'sharedClasses'], (done) => {
    var baseLog = (message, data) => {
        if (showLogs) {
            if (message == '\n') {
                console.log('');
            } else {
                var hasFunctionName = message[0] == '[' && message.indexOf(']') != -1;
                var functionName = hasFunctionName ? message.substring(0, message.indexOf(']') + 1) : '';
                var messageText = hasFunctionName ? message.substring(message.indexOf(']') + 2) : message;
                if (typeof data != 'undefined') {
                    var dataText = data;
                    switch (typeof data) {
                        case 'string':
                            dataText = gulp_util.colors.yellow(data);
                            break;
                        case 'number':
                            dataText = gulp_util.colors.green(data);
                            break;
                        case 'boolean':
                            dataText = gulp_util.colors.cyan(data);
                            break;
                    }
                    gulp_util.log(gulp_util.colors.magenta(functionName) + ' ' + messageText, dataText);
                } else {
                    gulp_util.log(gulp_util.colors.magenta(functionName) + ' ' + messageText);
                }
            }
        }
    };

    var tsProject = gulp_typescript.createProject('tsconfig.json', { typescript: typescript });

    var tsImport = (importOptions) => {
        var log = (message, data) => {
            baseLog('[tsimport] ' + message, data);
        }

        log('tsImport');
        log('importOptions:', importOptions);
        return through2.obj(function (file, encoding, cb) {
            var code = file.contents.toString('utf8');
            code = replacePath(code, file.history.toString(), importOptions);
            file.contents = new Buffer(code);
            this.push(file);
            cb();
        });
    };

    var replacePath = (code, filePath, importOptions) => {
        var rootPath = importOptions.baseUrl;
        var targetPaths = importOptions.paths;
        var log = (message, data) => {
            if (message == '\n') {
                baseLog(message);
            } else {
                baseLog('[replacePath] ' + message, data);
            }
        }

        log('\n');
        log('filePath:', filePath);
        log('rootPath:', rootPath);
        log('targetPaths:', targetPaths);

        var tscPaths = Object.keys(targetPaths);
        var lines = code.split('\n');

        var replacedLines = lines.map((line) => {
            var requireStatements = line.match(/require\(('|")(.*)('|")\)/g);
            if (requireStatements) {
                log('requireStatements:', requireStatements);
                log('old line:', line)
                for (var requireStatement of requireStatements) {
                    log('requireStatement:', requireStatement);
                    for (var tscPath of tscPaths) {
                        log('tscPath:', tscPath);
                        var requiredModules = requireStatement.match(new RegExp(tscPath, 'g'));
                        if (requiredModules && requiredModules.length > 0) {
                            for (var requiredModule of requiredModules) {
                                log('requiredModule:', requiredModule);
                                var modulePath = path.resolve('./node_modules/' + tscPath);
                                var modulePathIsInNodeModules = fs.existsSync(modulePath);
                                log('modulePathIsInNodeModules:', modulePathIsInNodeModules);
                                if (!modulePathIsInNodeModules) {
                                    var sourcePath = path.dirname(filePath).replace(/\\/g, '/');
                                    log('sourcePath:', sourcePath);
                                    var targetPath = path.dirname(path.resolve(rootPath + '/' + targetPaths[tscPath])).replace(/\\/g, '/');
                                    log('targetPath:', targetPath);
                                    var relativePath = path.relative(sourcePath, targetPath).replace(/\\/g, '/');
                                    log('relativePath:', relativePath);

                                    var firstPart = line.substring(0, line.indexOf('require("') + 9);
                                    var oldPath = line.substring(firstPart.length);
                                    var reqModWithoutSlash = requiredModule.substring(0, requiredModule.length - 1);
                                    var newPath = oldPath.substring(oldPath.indexOf(reqModWithoutSlash) + requiredModule.length, oldPath.indexOf('\"'));
                                    newPath = (relativePath + '/' + newPath).replace(/src/g, importOptions.outDir);
                                    line = firstPart + newPath + '\");';
                                    log('new line:', line);
                                }
                            }
                        }
                    }
                }
            }

            return line;
        }).join('\n');
        return replacedLines;
    };

    gulp.src('src/**/*')
        .pipe(tsProject())
        .pipe(tsImport(tsProject.config.compilerOptions))
        .on('error', (error, callback) => {
            console.log(gutil.colors.red('Error transpiling import paths:'), error.stack);
            this.emit('end');
        })
        .pipe(gulp.dest('dist'))
        .on('end', done);
    baseLog('\n');
});



//gulp.task('default', ['watch', 'assets']);

//gulp.task('watch', ['scripts'], () => {
//    gulp.watch('src/**/*.ts', ['scripts']);
//});

//gulp.task('assets', () => {
//    return gulp.src(JSON_FILES).pipe(gulp.dest('dist'));
//});

//gulp.task('scripts', () => {
//    const tsResult = tsProject.src().pipe(tsProject());
//    return tsResult.js.pipe(gulp.dest('dist'));
//});