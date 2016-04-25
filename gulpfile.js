var fs = require('fs');
var gulp = require("gulp");
var gutil = require('gulp-util');
var shell = require('gulp-shell');
var rename = require("gulp-rename");
var runSequence = require('run-sequence');
var livereload = require('gulp-livereload');

var IS_PRODUCTION_BUILD = process.argv.indexOf('--production') >= 0 || false;
var IS_TEST_BUILD = process.argv.indexOf('--test') >= 0 || false;
var IS_BETA_BUILD = process.argv.indexOf('--beta') >= 0 || false;


gulp.task("default", function() {
    livereload.listen({start: true});
    if (IS_TEST_BUILD) {
        runSequence(['serve-files', 'reload-changes', 'transpile-javascript', 'copy-test-assets']);
    } else {
        runSequence(['serve-files', 'reload-changes', 'transpile-javascript']);
    }
});

gulp.task("test", function() {
    runSequence(['serve-files', 'reload-test-changes', 'transpile-test-javascript']);
});

gulp.task("reload-test-changes", ['copy-html', 'copy-test-assets'], function() {
    gulp.watch('test/**/*.html', ['copy-test-assets']);
    gulp.watch('assets/**/*', ['copy-assets']);
    gulp.watch('public/test.js', ['reload-javascript']);
});

gulp.task("serve-files", shell.task([
    'http-server ./public -s -p 10001 -c-1'
]));

gulp.task("reload-changes", ['copy-html', 'copy-assets'], function() {
    gulp.watch('src/**/*.html', ['copy-html']);
    gulp.watch('assets/**/*', ['copy-assets']);
    gulp.watch('public/bundle.js', ['reload-javascript']);
});

gulp.task("transpile-javascript", shell.task([
    'webpack --progress --sort-assets-by --watch --colors ' + (IS_PRODUCTION_BUILD ? '--production' : '') + ' ' + (IS_TEST_BUILD ? '--test' : '') + ' ' + (IS_BETA_BUILD ? '--beta' : '')
]));

gulp.task("transpile-test-javascript", shell.task([
    'webpack --progress --sort-assets-by --watch --colors --test'
]));

gulp.task("reload-javascript", function() {
    livereload.changed({path: 'bundle.js'});
});

gulp.task("reload-test-javascript", function() {
    livereload.changed({path: 'test.js'});
});

gulp.task("copy-html", function() {
    gulp.src(['src/**/*.html'])
        .pipe(gulp.dest('public'))
        .pipe(livereload());
});

gulp.task("copy-assets", function() {
    gulp.src(['assets/**/*'])
        .pipe(gulp.dest('public/assets'))
        .pipe(livereload());
});

gulp.task("copy-test-assets", function() {
    gulp.src(['test/assets/**/*'])
        .pipe(gulp.dest('public/test/assets'))
        .pipe(livereload());
    gulp.src(['test/**/*.html'])
        .pipe(gulp.dest('public/test'))
        .pipe(livereload());
    gulp.src(['test/**/*.css'])
        .pipe(gulp.dest('public/test'))
        .pipe(livereload());
    gulp.src(['test/**/mocha.js'])
        .pipe(gulp.dest('public/test'))
        .pipe(livereload());
});
