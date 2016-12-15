/* -----------------------------------------------------------------------------------
   Map Quiz JS
   Develolped by the Applications Prototype Lab
   (c) 2014 Esri | https://www.esri.com/legal/software-license  
----------------------------------------------------------------------------------- */

require([
    'esri/map',
    'esri/graphic',
    'esri/layers/ArcGISTiledMapServiceLayer',
    'esri/layers/FeatureLayer',
    'esri/geometry/Point',
    'esri/tasks/query',
    'esri/tasks/QueryTask',
    'esri/tasks/StatisticDefinition',
    'esri/urlUtils',
    'dojo/parser',
    'dojo/domReady!'
],
function (
    Map,
    Graphic,
    ArcGISTiledMapServiceLayer,
    FeatureLayer,
    Point,
    Query,
    QueryTask,
    StatisticDefinition,
    urlUtils,
    parser
    ) {
    $(document).ready(function () {
        'use strict';

        // Load widgets
        parser.parse();

        // Constants
        var QUIZ = 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/MapQuizJS_Question/FeatureServer/0';
        var SCORES = 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/MapQuizJS_Scoring/FeatureServer/0';
        var WORLD_IMAGERY = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
        var PROXY = 'https://maps.esri.com/rc/quiz/proxy.ashx';
        var WIKI = 'https://en.wikipedia.org/w/api.php';
        var VENICE = new Point({
            'x': 1373572,
            'y': 5690108,
            'spatialReference': {
                'wkid': 102100
            }
        });
        var NUMBER_OF_QUESTIONS = 6;
        var TIME_LIMIT = 10;

        // Inidicate usage of proxy for the following hosted map services
        $.each([QUIZ, SCORES], function () {
            urlUtils.addProxyRule({
                urlPrefix: this,
                proxyUrl: PROXY
            });
        });

        // Facebook Profile
        var _fb = null;
        var _timer = null;
        var _isHome = true;
        var _games = [];
        var _gameIndex = 0;

        // Resize logic
        $(window).resize(function () {
            if (map || _isHome) {
                maximizeForRotation(map);
            }
        });

        // Initialize UI
        $('#button-play').attr('disabled', 'disabled');
        $('#map').animo({
            animation: 'spinner',
            iterate: 'infinite',
            timing: 'linear',
            duration: 90
        });
        $('#banner-welcome').slideDown();

        // Connect to FaceBook
        $.ajaxSetup({ cache: true });
        $.getScript('//connect.facebook.net/en_US/sdk.js', function () {
            FB.init({
                appId: '533790430081552',
                cookie: true,   // enable cookies to allow the server to access the session
                xfbml: false,   // parse social plugins on this page
                version: 'v2.0' // use version 2.0
            });
            FB.getLoginStatus(facebookStatusChanged);
        });

        // Expand map so that it can rotate
        function maximizeForRotation(map) {
            var c = Math.sqrt(
                Math.pow($(window).height(), 2) +
                Math.pow($(window).width(), 2)
            );
            var h = (c - $(window).height()) / -2;
            var w = (c - $(window).width()) / -2;
            $('#' + map.id).css({
                'marginBottom': h.toString() + 'px',
                'marginTop': h.toString() + 'px',
                'marginLeft': w.toString() + 'px',
                'marginRight': w.toString() + 'px'
            });
            map.resize();
            map.reposition();
        }

        // Create map
        var map = new Map('map', {
            logo: false,
            showAttribution: false,
            slider: false,
            center: VENICE,
            zoom: 17
        });
        map.addLayers([
            new ArcGISTiledMapServiceLayer(WORLD_IMAGERY, {
                id: 'world_imagery'
            })
        ]);
        map.on('load', function () {
            // Download ids and games as soon as the map has initialized
            getQuizIds().done(function (ids) {
                var gameIds = getGameIds(ids);
                getGames(gameIds).done(function (games) {
                    _games = games;
                    $('#button-play').removeAttr('disabled');
                });
            });
        });
        maximizeForRotation(map);

        // Button events
        $('#button-login').click(function () {
            FB.login(facebookStatusChanged);
        });
        $('#button-play').click(function () {
            _isHome = false;
            $('#banner-welcome').hide();
            $('#banner-top-high-score').html('0pt');
            playQuiz();
        });
        $('#button-highscores1, #button-highscores2').click(function () {
            _isHome = true;
            $('#banner-welcome').hide();
            $('#banner-highscore').slideDown();
            loadScores();
        });
        $('#button-highscore-tohome').click(function () {
            _isHome = true;
            $('#banner-welcome').slideDown();
            $('#banner-highscore').hide();
        });
        $('#button-logout').click(function () {
            FB.logout(facebookStatusChanged);
        });
        $('#button-next').click(function () {
            $('#banner-welcome').hide();
            $('#banner-bottom').hide();
            $('#banner-answer').hide();
            playQuiz();
        });
        $('#button-home').click(function () {
            _isHome = true;
            $('#banner-answer').hide();
            $('#banner-bottom').hide();
            $('#banner-welcome').slideDown();
            
            maximizeForRotation(map);
            map.centerAndZoom(VENICE, 17);
            $('#map').animo({
                animation: 'spinner',
                iterate: 'infinite',
                timing: 'linear',
                duration: 90
            });
        });
        $('#button-newgame').click(function () {
            $('#banner-bottom').hide();
            $('#banner-answer').hide();
            $('#banner-top-high-score').html('0pt');
            playQuiz();
        });
        $('#answers > button').click(function () {
            // Stop timer
            if (_timer) {
                window.clearTimeout(_timer);
                _timer = null;
            }
            // Get duration
            _games[_gameIndex].timeEnd = Date.now();

            // Update Score
            if ($(this).html() === _games[_gameIndex].quiz.answer) {
                _games[_gameIndex].correct = true;
            } else {
                _games[_gameIndex].correct = false;
                $(this).removeClass('btn-default');
                $(this).addClass('btn-danger');
            }

            //
            showGameScore();
        });
        $('input[name="when"]').change(function () {
            loadScores();
        });
        $('input[name="who"]').change(function () {
            loadScores();
        });

        // Reset map margins
        function restoreMargins(map) {
            $('#' + map.id).css({
                'marginBottom': '0px',
                'marginTop': '0px',
                'marginLeft': '0px',
                'marginRight': '0px'
            });
            map.resize();
            map.reposition();
        }

        function facebookStatusChanged(response) {
            if (response.status === 'connected') {
                $('#button-group-disconnected').hide();
                $('#button-group-connected').show();
                $('#banner-top').slideDown('fast', 'swing');
                getFacebookProfile('me').done(function (r) {
                    // first name/gender/id/last_name/link/locale/name/updated_time
                    _fb = r; 
                    $('#fb-name').html(_fb.name);

                    // Download user statistics
                    updateStatistics();
                });
                getFacebookPicture('me', 200).done(function (url) {
                    $('#fb-picture').css(
                        'background-image',
                        'url(\'{0}\')'.format(url)
                    );
                });
            } else {
                $('#button-group-disconnected').show();
                $('#button-group-connected').hide();
                $('#banner-top').slideUp('fast', 'swing');
                $('#banner-top-high').html('');
                $('#banner-top-rank').html('');
                $('#banner-top-life').html('');
            }
        }

        function getFacebookProfile(id) {
            var defer = new $.Deferred();
            var url = '/{0}'.format(id);
            FB.api(url, function (r) {
                defer.resolve(r);
            });
            return defer.promise();
        }

        function getFacebookPicture(id, size) {
            var defer = new $.Deferred();
            var url = '/{0}/picture?redirect={1}&height={2}&width={3}&type={4}'.format(
                id,
                '0',
                size,
                size,
                'normal'
            );
            FB.api(url, function(response) {
                var pic = response.data.url.replace('https', 'http');
                defer.resolve(pic);
            });
            return defer.promise();
        }

        function getQuizIds() {
            var defer = new $.Deferred();
            var query = new Query();
            query.where = '1=1';
            var queryTask = new QueryTask(QUIZ);
            queryTask.executeForIds(
                query,
                function (results) {
                    defer.resolve(results);
                },
                function (error) {
                    defer.reject(error);
                }
            );
            return defer.promise();
        }

        function getGameIds(ids) {
            // Randomize
            ids.sort(function () {
                return Math.round(Math.random()) - 0.5;
            });
            return ids.slice(0, NUMBER_OF_QUESTIONS);
        }

        function getGames(ids) {
            var defer = new $.Deferred();
            var query = new Query();
            query.objectIds = ids;
            query.outFields = [
                'question',
                'answer',
                'fake1',
                'fake2',
                'fake3',
                'level',
                'wiki'
            ];
            query.outSpatialReference = map.spatialReference;
            query.returnGeometry = true;
            var queryTask = new QueryTask(QUIZ);
            queryTask.execute(
                query,
                function (results) {
                    var games = [];
                    $.each(results.features, function () {
                        var game = {
                            quiz: {
                                location: this.geometry,
                                question: this.attributes.question,
                                answer: this.attributes.answer,
                                fake1: this.attributes.fake1,
                                fake2: this.attributes.fake2,
                                fake3: this.attributes.fake3,
                                level: this.attributes.level,
                                wiki: this.attributes.wiki
                            },
                            correct: false,
                            timeStart: null,
                            timeEnd: null,
                            score: 0
                        };
                        if (game.quiz.question &&
                            game.quiz.answer &&
                            game.quiz.fake1 &&
                            game.quiz.fake2 &&
                            game.quiz.fake3 &&
                            game.quiz.level &&
                            game.quiz.wiki) {
                            games.push(game);
                        }
                    });

                    defer.resolve(games);
                },
                function () { }
            );
            return defer.promise();
        }

        function playQuiz() {
            var defer = new $.Deferred();

            // Clease map rotation
            $('#map').animo('cleanse');
            restoreMargins(map);

            // Restore button classes
            $('#answers > button')
                .removeClass('btn-success')
                .removeClass('btn-danger')
                .addClass('btn-default');

            // Start timer only after map has loaded
            var playing = true;
            map.on('update-end', function () {
                if (!playing) { return; }
                playing = false;

                var answers = [
                    _games[_gameIndex].quiz.answer,
                    _games[_gameIndex].quiz.fake1,
                    _games[_gameIndex].quiz.fake2,
                    _games[_gameIndex].quiz.fake3
                ];
                answers.sort(function () {
                    return Math.round(Math.random()) - 0.5;
                });

                $('#banner-bottom').slideDown('fast', 'swing');
                $('#timer').show();

                $('#question').html(_games[_gameIndex].quiz.question);
                $('#button-answer1').html(answers[0]);
                $('#button-answer2').html(answers[1]);
                $('#button-answer3').html(answers[2]);
                $('#button-answer4').html(answers[3]);
                $('#answers > button').removeAttr('disabled');
                
                if (_timer) {
                    clearTimeout(_timer);
                    _timer = null;
                }
                _timer = setTimeout(function () {
                    _games[_gameIndex].timeEnd = _games[_gameIndex].timeStart + TIME_LIMIT * 1000;
                    _games[_gameIndex].correct = false;
                    //_quizWrong++;
                    showGameScore();
                }, TIME_LIMIT * 1000);
                _games[_gameIndex].timeStart = Date.now();

                $('#timer-sand').animo({
                    animation: 'shift-right',
                    duration: TIME_LIMIT,
                    iterate: 1,
                    timing: 'linear'
                });
                $('#map').animo({
                    animation: 'grow',
                    duration: TIME_LIMIT,
                    iterate: 1,
                    timing: 'linear'
                });

                // Download wikipedia snippet
                $('#banner-answer-right-value').html('');
                
                var url = '{0}?{1}'.format(PROXY, WIKI);
                url += '?action=query';
                url += '&prop=extracts';
                url += '&format=json';
                url += '&exintro';
                url += '&explaintext';
                url += '&titles={0}'.format(
                    _games[_gameIndex].quiz.wiki
                );

                // Display wikipedia snippet
                $.get(url, function (data) {
                    var p = data.query.pages;
                    var e = null;
                    for (var i in p) {
                        if (p.hasOwnProperty(i)) {
                            e = p[i].extract;
                            break;
                        }
                    }
                    $('#banner-answer-right-value').html(e);
                });

                defer.resolve();
            });

            // Zoom to quiz
            map.centerAndZoom(
                _games[_gameIndex].quiz.location,
                _games[_gameIndex].quiz.level
            );

            return defer.promise();
        }

        function showGameScore() {
            // Disable answer buttons
            $('#answers > button').attr('disabled', 'disabled');

            // Stop animation
            $('#timer-sand').animo('pause');
            $('#map').animo('pause');

            // Show correct answer
            $('#answers > button').each(function () {
                if ($(this).html() === _games[_gameIndex].quiz.answer) {
                    $(this).removeClass('btn-default');
                    $(this).addClass('btn-success');
                    return false;
                }
            });

            // Score dialog
            $('#banner-answer-left-answer-value').html('');
            $('#banner-answer-left-bonus-value').html('');
            $('#banner-answer-left-total-value').html('');
            $('#banner-answer').slideDown();

            // Game count
            var games = _gameIndex + 1;
            $('#banner-answer-left-question-value').html('{0}/{1}'.format(
                games.toString(),
                NUMBER_OF_QUESTIONS.toString()
            ));
            
            // Points for correct answer
            var award = _games[_gameIndex].correct ? 10 : 0;

            // Points for time bonus
            var bonus = 0;
            if (_games[_gameIndex].correct) {
                var e = _games[_gameIndex].timeEnd.valueOf();
                var s = _games[_gameIndex].timeStart.valueOf();
                var d = 1 - (e - s) / (TIME_LIMIT * 1000);
                bonus = Math.round(d * 10); // Ten points
            }

            // Sum of award and time bonus
            var total = award + bonus;

            // Get old and new total score
            var oldTotalScore = 0;
            var newTotalScore = 0;
            $.each(_games, function () {
                oldTotalScore += this.score;
            });
            _games[_gameIndex].score = total;
            $.each(_games, function () {
                newTotalScore += this.score;
            });

            animateLabel($('#banner-answer-left-answer-value'), 0, award).done(function () {
                animateLabel($('#banner-answer-left-bonus-value'), 0, bonus).done(function () {
                    animateLabel($('#banner-answer-left-total-value'), 0, total).done(function () {
                        animateLabel($('#banner-top-high-score'), oldTotalScore, newTotalScore).done(function () {
                            //
                        });
                    });
                });
            });
            
            // The "about" title
            $('#banner-answer-right-title').html('About {0}'.format(_games[_gameIndex].quiz.answer));
            
            // Credit link
            $('#banner-answer-right-wiki').prop(
                'href',
                'http://en.wikipedia.org/wiki/{0}'.format(_games[_gameIndex].quiz.wiki)
            );

            // Increment game index
            _gameIndex++;

            var finished = _gameIndex === _games.length;
            if (finished) {
                // Show 'home' and 'new game' buttons
                $('#banner-answer-next').hide();
                $('#banner-answer-home').show();

                // Disable 'play' and 'new game' buttons while downloading new quizes
                $('#button-play').attr('disabled', 'disabled');
                $('#button-newgame').attr('disabled', 'disabled');
            
                // Immediately request new game data
                getQuizIds().done(function (ids) {
                    var gameIds = getGameIds(ids);
                    getGames(gameIds).done(function (games) {
                        _games = games;
                        _gameIndex = 0;
                        $('#button-play').removeAttr('disabled');
                        $('#button-newgame').removeAttr('disabled');
                    });
                });
                
                var correct = 0;
                var wrong = 0;
                $.each(_games, function () {
                    if (this.correct) {
                        correct++;
                    } else {
                        wrong++;
                    }
                });

                var g = new Graphic(
                    new Point({
                        'x': 0,
                        'y': 0,
                        'spatialReference': {
                            'wkid': 102100
                        }
                    }),
                    null,
                    {
                        'fbid': _fb.id,
                        'score': newTotalScore,
                        'date': Date.now(),
                        'correct': correct,
                        'wrong': wrong
                    }
                );
                var fl = new FeatureLayer(SCORES);

                fl.applyEdits([g]).then(function () {
                    updateStatistics();
                });
            } else {
                $('#banner-answer-next').show();
                $('#banner-answer-home').hide();
            }
        }

        function animateLabel(div, from, to) {
            var defer = new $.Deferred();           
            var INTERVAL = 75;
            var duration = (to - from) * INTERVAL / 1000;
            var timer = window.setInterval(
                function () {
                    div.html('{0}pt'.format(from.toString()));
                    if (from === to) {
                        window.clearInterval(timer);
                        defer.resolve();
                    }
                    from++;
                },
                INTERVAL
            );
            div.animo({
                animation: 'glow-red',
                duration: Math.max(duration, 0.5),
                iterate: 1,
                timing: 'linear'
            });
            return defer.promise();
        }

        function updateStatistics() {
            var s1 = new StatisticDefinition();
            var s2 = new StatisticDefinition();
            var s3 = new StatisticDefinition();
            s1.statisticType = 'count';
            s1.onStatisticField = 'fbid';
            s1.outStatisticFieldName = 'count';
            s2.statisticType = 'sum';
            s2.onStatisticField = 'score';
            s2.outStatisticFieldName = 'sum';
            s3.statisticType = 'max';
            s3.onStatisticField = 'score';
            s3.outStatisticFieldName = 'max';

            var query = new Query();
            query.where = '1=1';
            query.returnGeometry = false;
            query.orderByFields = ['max DESC'];
            query.groupByFieldsForStatistics = ['fbid'];
            query.outStatistics = [s1, s2, s3];

            var queryTask = new QueryTask(SCORES);
            queryTask.execute(
                query,
                function (results) {
                    // Exit if nothing returned
                    if (!results || !results.features || results.features.length === 0) {
                        return;
                    }
                    var stats = [];
                    $.each(results.features, function () {
                        stats.push({
                            fbid: this.attributes.fbid,
                            max: this.attributes.max,
                            sum: this.attributes.sum,
                            count: this.attributes.count
                        });
                    });

                    // Number of players:
                    var players = stats.length;

                    // Find index of current user
                    var place = 1;
                    var personalBest = 0;
                    var lifetime = 0;
                    $.each(stats, function (index) {
                        if (this.fbid === _fb.id) {
                            place = index + 1;
                            personalBest = this.max;
                            lifetime = this.sum;
                            return false;
                        }
                    });

                    // Update top banner
                    $('#banner-top-high').html('{0}pt'.format(personalBest));
                    $('#banner-top-rank').html('{0}/{1}'.format(place, players));
                    $('#banner-top-life').html('{0}pt'.format(lifetime));
                },
                function () { }
            );
        }

        function loadScores() {
            // Clear old scores
            $('#banner-highscore-right').empty();

            // Load new scores
            showScores().done(function (scores) {
                $.each(scores, function () {
                    var div = $(document.createElement('div'))
                        .css('display', 'inline-block')
                        .css('background', 'rgba(0, 0, 0, 0.6)')
                        .css('width', '250px')
                        .css('height', '100px')
                        .css('margin', '1em 0em 0em 1em');

                    var bas = $(document.createElement('div'))
                        .css('position', 'relative')
                        .css('top', '0px')
                        .css('left', '0px');

                    var img = $(document.createElement('div'))
                        .css('position', 'absolute')
                        .css('top', '0px')
                        .css('left', '0px')
                        .css('width', '100px')
                        .css('height', '100px');

                    var txt = $(document.createElement('div'))
                        .css('position', 'absolute')
                        .css('top', '0px')
                        .css('left', '110px');

                    $(document.createElement('div'))
                        .css('display', 'block')
                        .css('color', 'white')
                        .css('font-family', 'AvenirNextLTW01-Heavy')
                        .css('font-size', '2em')
                        .css('pointer-events', 'none')
                        .css('text-align', 'left')
                        .html(this.score + 'pt')
                        .appendTo(txt);

                    var nam = $(document.createElement('div'))
                        .css('display', 'block')
                        .css('font-weight', 'bold')
                        .css('color', 'white')
                        .css('font-size', '1em')
                        .css('pointer-events', 'none')
                        .appendTo(txt);

                    if (this.correct !== null && this.wrong !== null) {
                        $(document.createElement('div'))
                            .css('display', 'block')
                            .css('color', 'white')
                            .css('font-size', '1em')
                            .css('pointer-events', 'none')
                            .html('{0}/{1}'.format(
                                this.correct,
                                this.correct + this.wrong
                            )
                        ).appendTo(txt);
                    }

                    if (this.date !== null) {
                        $(document.createElement('div'))
                            .css('display', 'block')
                            .css('color', 'white')
                            .css('font-size', '1em')
                            .css('pointer-events', 'none')
                            .html(formatDate(this.date))
                            .appendTo(txt);
                    }
                    
                    //sco.appendTo(txt);
                    //nam.appendTo(txt);
                    //cor.appendTo(txt);
                    //dat.appendTo(txt);

                    img.appendTo(bas);
                    txt.appendTo(bas);
                    bas.appendTo(div);
                    div.appendTo('#banner-highscore-right');

                    getFacebookProfile(this.fbid).done(function (r) {
                        var n = '{0} {1}.'.format(
                            r.first_name,
                            r.last_name.substring(0, 1)
                        );
                        nam.html(n);
                    });
                    getFacebookPicture(this.fbid, 100).done(function (url) {
                        img.css({
                            background: 'url({0})'.format(url)
                        });
                    });
                });
            });
        }

        function showScores() {
            var defer = new $.Deferred();
            var query = new Query();
            query.returnGeometry = false;
            query.num = 200;
            var where = '';
            var queryTask = new QueryTask(SCORES);

            // Hide zero scores
            where += 'score > 0';

            // Filter by time
            var d = new Date();
            if ($('#button-when-today').prop('checked')) {
                where += " AND date >= '{0}/{1}/{2}'".format(
                    d.getMonth() + 1,
                    d.getDate(),
                    d.getFullYear()
                );
            } else if ($('#button-when-month').prop('checked')) {
                where += " AND date >= '{0}/{1}/{2}'".format(
                    d.getMonth() + 1,
                    '1',
                    d.getFullYear()
                );
            } else if ($('#button-when-year').prop('checked')) {
                where += " AND date >= '{0}/{1}/{2}'".format(
                    '1',
                    '1',
                    d.getFullYear()
                );
            }

            // Filter by user
            if ($('#button-who-me').prop('checked')) {
                where += " AND fbid = '{0}'".format(_fb.id);
                query.where = where;
                query.outFields = [
                    'fbid',
                    'score',
                    'date',
                    'correct',
                    'wrong'
                ];
                query.orderByFields = ['score DESC', 'correct DESC'];
                queryTask.execute(
                    query,
                    function (results) {
                        defer.resolve(results.features.map(function (e) {
                            return {
                                fbid: e.attributes.fbid,
                                score: e.attributes.score,
                                date: e.attributes.date,
                                correct: e.attributes.correct,
                                wrong: e.attributes.wrong
                            };
                        }).filter(function (e) {
                            return e.fbid !== null &&
                                   e.score !== null &&
                                   e.date !== null &&
                                   e.correct !== null &&
                                   e.wrong !== null;
                        }));
                    }
                );
            }
            else {
                var s1 = new StatisticDefinition();
                s1.statisticType = 'max';
                s1.onStatisticField = 'score';
                s1.outStatisticFieldName = 'max';
                query.where = where;
                query.groupByFieldsForStatistics = ['fbid'];
                query.outStatistics = [s1];
                query.orderByFields = ['max DESC'];
                queryTask.execute(
                    query,
                    function (results) {
                        defer.resolve(results.features.map(function (e) {
                            return {
                                fbid: e.attributes.fbid,
                                score: e.attributes.max,
                                date: null,
                                correct: null,
                                wrong: null
                            };
                        }).filter(function (e) {
                            return e.fbid !== null && e.score !== null;
                        }));
                    }
                );
            }
            return defer.promise();
        }
    });
});

String.prototype.format = function () {
    var s = this;
    var i = arguments.length;
    while (i--) {
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    }
    return s;
};

function formatDate(ticks) {
    var d = new Date(ticks);
    return '{0}/{1}/{2}'.format(
        pad((d.getMonth() + 1), 2),
        pad(d.getDate(), 2),
        d.getFullYear()
    );
}

function pad(num, size) {
    var s = num.toString();
    while (s.length < size) {
        s = '0' + s;
    }
    return s;
}
