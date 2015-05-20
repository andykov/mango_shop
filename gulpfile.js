'use strict';

var gulp = require('gulp'),
	watch = require("gulp-watch"),
	prefixer = require('gulp-autoprefixer'),
	stylus = require('gulp-stylus'),
	sourcemaps = require('gulp-sourcemaps'),
	minifyCSS = require('gulp-minify-css'),
	uglify = require('gulp-uglify'),
	rigger = require('gulp-rigger'),
	imagemin = require('gulp-imagemin'),
	pngquant = require('imagemin-pngquant'),
	spritesmith = require('gulp.spritesmith'),
	rimraf = require('rimraf'),
	rename = require('gulp-rename'),
	plumber = require('gulp-plumber'),
	jshint = require('gulp-jshint'),
	browserSync = require("browser-sync").create(),
	reload = browserSync.reload;

var path = {
	//Говорим куда складывать готовые после сборки файлы
	build: { 
		html: 'build/',
		js: 'build/js/',
		css: 'build/css/',
		img: 'build/img/',
		spriteImg: 'build/img/sprite/', // сюда кидаем готовый спрайт
		fonts: 'build/css/fonts/'
	},
	//Пути откуда брать исходники
	src: { 
		html: 'src/*.html',
		scripts: 'src/scripts/**/*.js',
		style: 'src/style/style.styl',
		images: ['src/images/**/*', '!src/images/sprite/*.*'], // Игнорируем папку для спрайта
		spriteOrigin: 'src/images/sprite/*.*', // отсюда берем исходники для спрайта
		spriteStylus: 'src/style/modules/', // отсюда берем исходники для спрайта
		fonts: 'src/style/fonts/**/*.*'
	},
	//Следим за файлами
	watch: {
		html: 'src/**/*.html',
		scripts: 'src/scripts/**/*.js',
		style: 'src/style/**/*.styl',
		images: 'src/images/**/*',
		sprite: 'src/images/sprite/*.*',
		fonts: 'src/style/fonts/**/*.*'
	},
	clean: './build/img/*'
};


// Поднимаем вебсервер
gulp.task('webserver', function () {
	// [path.watch.style, path.watch.scripts], 
	browserSync.init({
        server: {
			baseDir: "./build"
		},
		host: 'localhost',
		port: 9000,
		logPrefix: "gulp_frontend",
		// tunnel: true,
		ui: {
		    port: 9001
		}
    });
    browserSync.notify("Compiling, please wait!");
    // with config + callback
	// browserSync.init(config, function (err, browserSync) {
	//     if (!err) {
	//         console.log("BrowserSync is ready!");
	//     }
	// });
});

// Сборка HTML
gulp.task('html:build', function () {
	gulp.src(path.src.html)
		.pipe(plumber())
		.pipe(rigger()) // Инклюдит файлы, пример (//= template/footer.html)
		.pipe(gulp.dest(path.build.html))
		.pipe(reload({stream:true}));
});

// Сборка CSS
gulp.task('style:build', function () {
	gulp.src(path.src.style)
		.pipe(plumber())
		.pipe(sourcemaps.init()) // Инициализируем sourcemap
		.pipe(stylus())
		.pipe(prefixer({browsers: ['last 4 versions', 'ie 8']}))
		.pipe(minifyCSS())
		.pipe(sourcemaps.write()) // Пропишем карты
		.pipe(rename({suffix: ".min"})) // Пропишем карты
		.pipe(gulp.dest(path.build.css))
		.pipe(reload({stream:true}));
});


// Сборка JS
gulp.task('js:build', function () {
	gulp.src(path.src.scripts)
		// .pipe(plumber())
		.pipe(jshint())
		.pipe(jshint.reporter("default"))
		.pipe(uglify())
		.pipe(gulp.dest(path.build.js))
		.pipe(reload({stream:true}));
});


// Сжатие изображений
gulp.task('images:build', function () {
	gulp.src(path.src.images)
		.pipe(imagemin({
			progressive: true,
			svgoPlugins: [{removeViewBox: false}],
			use: [pngquant()],
			interlaced: true
		}))
		.pipe(gulp.dest(path.build.img))
		.pipe(reload({stream:true}));
});


// Генерация спрайта, http://habrahabr.ru/post/227945/
gulp.task('sprite:build', function() {
	var spriteData = 
		gulp.src(path.src.spriteOrigin) // путь, откуда берем картинки для спрайта
			.pipe(spritesmith({
				imgName: 'sprite.png',
				cssName: 'sprite.styl',
				cssFormat: 'stylus',
				algorithm: 'binary-tree',
				cssTemplate: 'stylus.template.mustache', // формат css переменных
				cssVarMap: function(sprite) {
					sprite.name = 's-' + sprite.name
				}
			}));

	spriteData.img.pipe(gulp.dest(path.build.spriteImg)); // путь, куда сохраняем картинку
	spriteData.css.pipe(gulp.dest(path.src.spriteStylus)); // путь, куда сохраняем стили
});


// Просто копируем шрифты в папку build
gulp.task('fonts:build', function() {
	gulp.src(path.src.fonts)
		.pipe(gulp.dest(path.build.fonts))
});

// Такс запускает одной командой все предыдущие таски
gulp.task('build', [
	'html:build',
	'style:build',
	'js:build',
	'images:build',
	'sprite:build',
	'fonts:build'
]);


// Следим за файлами
gulp.task('watch', function() {
	gulp.watch(path.watch.html, ['html:build'])
	gulp.watch(path.watch.style, ['style:build'])
	gulp.watch(path.watch.scripts, ['js:build'])
	gulp.watch(path.watch.images, ['images:build'])
	gulp.watch(path.watch.images, ['sprite:build'])
	gulp.watch(path.watch.fonts, ['fonts:build'])
	// для отслеживания новых изображений, используется плагин gulp-watch
	watch([path.watch.images], function(event, cb) {
		gulp.start('images:build');
	});
});

// Если из рабочей папки images удалить изображения, они все равно останутся в папке build
// Очистим всю папку, после этого нужно будет перезапустить команду gulp
gulp.task('clean', function (cb) {
	rimraf(path.clean, cb);
});


// Запускаем всю сборку таском по умолчанию
gulp.task('default', ['build', 'webserver', 'watch']);