var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var del = require('del');
 
var paths = {
  scripts: ['src/**/*.js'],
  images: 'client/img/**/*'
};
 
// Not all tasks need to use streams 
// A gulpfile is just another node program and you can use any package available on npm 
gulp.task('clean', function() {
  // You can use multiple globbing patterns as you would with `gulp.src` 
  return del(['build']);
});
 
gulp.task('scripts', ['clean'], function() {
  // Minify and copy all JavaScript (except vendor scripts) 
  // with sourcemaps all the way down 
  return gulp.src(paths.scripts)
    .pipe(uglify())
    .pipe(concat('mist-api.min.js'))
    .pipe(gulp.dest('dist'));
});

/*
// Rerun the task when a file changes 
gulp.task('watch', function() {
  gulp.watch(paths.scripts, ['scripts']);
});
*/

// The default task (called when you run `gulp` from cli) 
gulp.task('default', ['scripts']);

