/* -----------------------------------------------------------------------------------
   Map Quiz JS
   Develolped by the Applications Prototype Lab
   (c) 2014 Esri | https://www.esri.com/legal/software-license  
----------------------------------------------------------------------------------- */

'use strict';

require([
    'esri/map',
    'esri/layers/ArcGISTiledMapServiceLayer',
    'esri/layers/FeatureLayer',
    'esri/geometry/Extent',
    'esri/graphic',
    'esri/symbols/PictureMarkerSymbol',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/renderers/SimpleRenderer',
    'esri/Color',
    'esri/urlUtils',
    'esri/tasks/query',
    'esri/tasks/locator',
    'dojo/parser',
    'dojo/domReady!'
],
function (
    Map,
    ArcGISTiledMapServiceLayer,
    FeatureLayer,
    Extent,
    Graphic,
    PictureMarkerSymbol,
    SimpleMarkerSymbol,
    SimpleLineSymbol,
    SimpleRenderer,
    Color,
    urlUtils,
    Query,
    Locator,
    parser
    ) {
    $(document).ready(function () {
        //
        parser.parse();

        //
        var WORLD_IMAGERY = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
        var QUIZ = 'https://services.arcgis.com/6DIQcwlPy8knb6sg/arcgis/rest/services/MapQuizJS_Question/FeatureServer/0';
        var PROXY = 'https://maps.esri.com/rc/quiz/proxy.ashx';
        
        // Inidicate usage of proxy for the following hosted map services
        $.each([QUIZ], function () {
            urlUtils.addProxyRule({
                urlPrefix: this,
                proxyUrl: PROXY
            });
        });

        // Variables
        var _wi = new ArcGISTiledMapServiceLayer(WORLD_IMAGERY, {
            id: 'world_imagery'
        });
        var _fl = new FeatureLayer(QUIZ, {
            id: 'cases',
            mode: FeatureLayer.MODE_SNAPSHOT,
            outFields: [
                'question',
                'answer',
                'fake1',
                'fake2',
                'fake3',
                'wiki',
                'level'
            ]
        });
        _fl.setRenderer(new SimpleRenderer(new PictureMarkerSymbol({
            'url':'img/pink_blank.png',
            'height':32.25,
            'width': 23.25,
            'type': 'esriPMS',
            'angle': 0,
            'xoffset': 0,
            'yoffset':11.125            
        })));
        _fl.setSelectionSymbol(new PictureMarkerSymbol({
            'url': 'img/blue_blank.png',
            'height': 32.25,
            'width': 23.25,
            'type': 'esriPMS',
            'angle': 0,
            'xoffset': 0,
            'yoffset': 11.125
        }));
        _fl.on('mouse-down', function (e) {
            selectQuiz(e.graphic.attributes[_fl.objectIdField]);
        })
        _fl.on('selection-complete', function (e) {
            if (!e || !e.features || e.features.length == 0) { return; }

            $('#inputQuestion').val(e.features[0].attributes['question']);
            $('#inputAnswer').val(e.features[0].attributes['answer']);
            $('#inputFake1').val(e.features[0].attributes['fake1']);
            $('#inputFake2').val(e.features[0].attributes['fake2']);
            $('#inputFake3').val(e.features[0].attributes['fake3']);
            $('#inputWiki').val(e.features[0].attributes['wiki']);

            openMenu();

            var center = e.features[0].geometry;
            var level = e.features[0].attributes['level'];
            map.centerAndZoom(center, isNaN(level) ? 7 : level);
        });

        // Create map
        var map = new Map('map', {
            logo: false,
            showAttribution: false,
            slider: true
        });
        map.addLayers([
            _wi,
            _fl
        ]);

        $('#inputSearch').keyup(function (e) {
            if (e.keyCode == 13) {
                var url = 'http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer';
                var locator = new Locator(url);
                locator.outSpatialReference = map.spatialReference;
                locator.on('address-to-locations-complete', function (l) {
                    if (!l || !l.addresses || l.addresses.length == 0) { return; }
                    var candidate = l.addresses[0];
                    map.centerAndZoom(
                        candidate.location,
                        Math.max(map.getLevel(), 10)
                    );
                });
                locator.addressToLocations({
                    address: {
                        "SingleLine": $('#inputSearch').val()
                    },
                    outFields: ["Loc_name"]
                });
            }
        });
        $('#buttonAdd').click(function () {
            var g = new Graphic(map.extent.getCenter(), null, {
                'question': '',
                'answer': '',
                'fake1': '',
                'fake2': '',
                'fake3': '',
                'wiki': '',
                'level': map.getLevel()
            });
            _fl.applyEdits([g]).then(function (value) {
                if (!value || value.length == 0) { return;}
                var id = value[0].objectId;
                selectQuiz(id);
            });
        });
        $('#buttonSave').click(function () {
            var selectedGraphics = _fl.getSelectedFeatures();
            if (!selectedGraphics || selectedGraphics.length == 0) { return; }

            selectedGraphics[0].setGeometry(map.extent.getCenter());
            selectedGraphics[0].attributes['question'] = $('#inputQuestion').val();
            selectedGraphics[0].attributes['answer'] = $('#inputAnswer').val();
            selectedGraphics[0].attributes['fake1'] = $('#inputFake1').val();
            selectedGraphics[0].attributes['fake2'] = $('#inputFake2').val();
            selectedGraphics[0].attributes['fake3'] = $('#inputFake3').val();
            selectedGraphics[0].attributes['wiki'] = $('#inputWiki').val();
            selectedGraphics[0].attributes['level'] = map.getLevel();

            _fl.applyEdits(null, selectedGraphics).then(function (value) {
                //
            });
        });
        $('#buttonClose').click(function () {
            _fl.clearSelection();
            closeMenu();
        });
        $('#buttonDelete').click(function () {
            var selectedGraphics = _fl.getSelectedFeatures();
            if (!selectedGraphics || selectedGraphics.length == 0) { return; }
            _fl.applyEdits(null, null, selectedGraphics).then(function (value) {
                //
            });
            closeMenu();
        });

        function openMenu() {
            if (!$('#banner').is(":visible")) {
                $('#box').hide();
                $('#banner').animo({
                    animation: 'open-menu',
                    duration: 0.2,
                    iterate: 1,
                    timing: 'ease-out'
                });
                $('#banner').show();
            }
        };

        function closeMenu() {
            if ($('#banner').is(":visible")) {
                $('#banner').animo({
                    animation: 'close-menu',
                    duration: 0.2,
                    iterate: 1,
                    timing: 'ease-in'
                }, function () {
                    $('#banner').hide();
                    $('#box').show();
                });
            }
        };

        function selectQuiz(id) {
            var query = new Query();
            query.where = '{0} = {1}'.format(
                _fl.objectIdField,
                id
            );
            _fl.selectFeatures(query, FeatureLayer.SELECTION_NEW);
        };
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
