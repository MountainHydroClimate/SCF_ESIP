// Important!! Read ME!
// This code is the property of Oregon State University Mountain Hydroclimatology Research Group
// Please contact Dr. Anne Nolin for any inquiries: nolina@oregonstate.edu

//
// Operational Instruction:
// Select Run to show input and default options.
// Input Options: (Note after selecting input options,
//                 Hit Apply Button to display resulting SCF)
//  YearMonth: 201501 (default)
//      Specify year and 2 digit month as a single number
// 
//  ROI: Select Watershed ROI...
//      Dropdown table show watershed available for analysis.
//      When selecting 'All', all watershed SCF will be displayed on map, but statisical info is
//      only for first watershed listed in watershed fusion table. So if JohnDay is listed first 
//      then JohnDay statistics will only be shown when 'All' is selected.
//
//  Elev Range (low/high) : All (default)
//      Specify Elevation Ranges in meters. For example if one elevation is specified,
//      then SCF is displayed for elevations greater than or equal to.
//      If both low / high elevations are specified, then SCF displayed elevations
//      between low and high.
//
//  Watershed Statistic Info: Mean Elevation, Area, Mean SCF, Min SCF, Max SCF, Stdev SCF,
//      Median SCF.
//
//  Apply - Select this button to display watershed SCF result of input options.
//
//  Plot Watershed Mean SCF vs YearMonth - 2015:2016 (default) 
//                  Plot SCF for the selected watershed for the specified year range.
//                  Note this may take time to generate and display. So be patient.
//                  May take longer to generate plot for longer range of years.  
//                  NOTE:To get a larger view of the plot in a separate window and download
//                  SCF data, hit the icon on the upper right corner of the plot image.
//
//  Export Image - Used to export geotif image to Google Drive.
//                 Select 1 to 2 layers to export with band order dependent on list from left
//                 to right: SCFcloud, DEM (default)
//                 For example if DEM, SCFcloud layers are selected (in that order) then exported image has
//                 DEM (Band1), and SCFcloud (Band2).
//                 If SCFcloud, DEM layers are selected (in that order) then exported image has SCFcloud (Band1),
//                 DEM (Band2).
//                 Note: Plot area is automatically determined to be a rectangular area encompassing the 
//                 watershed with 10km of buffer on all sides.
//                 Can select projection with default projection EPSG:3857, which is used in many popular 
//                 web  applications (Google/Bing/OpenStreetMap/etc). AKA EPSG:900913. 
//

var DEM = ee.Image("USGS/SRTMGL1_003");
var StatesFT = ee.FeatureCollection("ft:1OoBTpAqkASRRnJ_tsUOiswz06-0r2Nc9ncxQM68");
var WaterShedsFC = ee.FeatureCollection('ft:1xqeARi7ndPeNZcI6yG7B_stFlQl9Mm8C61yw9-3P');
var WaterShedsFC_List;

////////////////////////  COLOR PALETTES  ////////////////////////////////
// Create a color palette for the snow layer.
// This palette was found at the Color Brewer website.
var palette_snow = "081d58,253494,225ea8,1d91c0,41b6c4,7fcdbb,c7e9b4,edf8b1,ffffd9";

// Range of year
var yrStart = 2000;
var yrEnd = new Date().getFullYear();
//var yrEnd = 2002;

var dateUpdated = 1;
var centerUpdated = 1;
var stateUpdated = 1;
var elevUpdated = 1;
var mapChart = 0;
var ftid1 = '17aiw8txepanXc18e5971WteiYALWoygiLZl7KZHG';

// The namespace for scf.  All the state is kept in here.
var scf = {};
var scfImages = {};
var scfMeans = {};
var scfMins = {};
var scfMaxs = {};
var scfStdevs = {};
var scfMedians = {};

//var scfImages_nocloud = {};
//var scfqaImages = {};

var nroi;
var ROIs;
var ROI;
var elevation;
var centroid;
var scf_area;

scf.applyFilters = function(){
    var startDate = scf.filters.startDate.getValue();
    var endDate = scf.filters.endDate.getValue();

    var lat = ee.Number.parse(scf.filters.mapCenterLat.getValue()).getInfo();
    var lon = ee.Number.parse(scf.filters.mapCenterLon.getValue()).getInfo();
    //print('lat :', lat);
    //print('lon :', lon);

    return [startDate, endDate, lat, lon];
};

scf.setMapCenter = function() {
    // The .filterMetadata is a built-in GEE function that allows you to only
    // select the state/s of interest.
    var state;
    var states;
    var nstates;
    var ftid;
    var ftColName;
    var roi;

    if ((centerUpdated || dateUpdated) && mapChart) {
      Map.remove(mapChart);
      mapChart = 0;
    }
    var startDate = scf.filters.dateRange.getValue();
    //var year = startDate.slice(0,4);
    var scfImage = 'MODIS_SCF_' + startDate;
    //if (dateUpdated == 1) {
      //scf.genSCF();
    //}
    
    var displaySCF = ee.Image(scfImages[scfImage]);
    //var displaySCF_nocloud = ee.Image(scfImages_nocloud[scfImage]);
    //var displaySCFQA = ee.Image(scfqaImages[scfImage]);
    var elev;
    if (scf.filters.elevRange.getValue() != 'All') {
      var elevs = scf.filters.elevRange.getValue().replace(/\s+/g,'').split('/');
      if (elevs.length == 1) {
        elev = DEM.expression("(BAND>=" + elevs[0] + ")",{BAND:DEM.select('elevation')});
        //print(elev, elevRange);
      }
      else {
        elev = DEM.expression("(BAND>=" + elevs[0] + "&&BAND<=" + elevs[1] + ")",{BAND:DEM.select('elevation')});
      }
      //displaySCF = scfImages[scfImage].updateMask(elev);
      //displaySCF_nocloud = scfImages_nocloud[scfImage].updateMask(elev);
      displaySCF = displaySCF.updateMask(elev);
      //displaySCF_nocloud = displaySCF_nocloud.updateMask(elev);
      //displaySCFQA = displaySCFQA.updateMask(elev);
    }

    if ((dateUpdated == 1) || (stateUpdated == 1) || elevUpdated == 1) {
      Map.clear();
      states = ROI.replace(/\s+/g,'').split('+');
      nstates = states.length;

      var statesFC = new Array(nstates);
      for (var i=0; i < nstates; i++) {
        statesFC[i] = WaterShedsFC.filter(ee.Filter.stringContains('Name', states[i]));
      }
      state = ee.FeatureCollection(statesFC).flatten();
      //print(statesFC);

      if (nstates > 1) {
        roi = WaterShedsFC.first().geometry();
      }
      else {
        roi = state.geometry();
      }
      centroid = roi.centroid();
      //print(centroid);

      Map.addLayer(displaySCF.clip(state), {'palette':palette_snow}, 'SCF w/Cloud', 1);
          //Map.addLayer(displaySCF_nocloud.clip(state), {'palette':palette_snow}, 'SCF noCloud', 0);
          //Map.addLayer(displaySCF.clip(state), {'palette':palette_snow, min: 0}, 'SCF QA', 0);
        //}
      //}
      if (mapChart) {
        Map.add(mapChart);
      }
      dateUpdated = 0;
      stateUpdated = 0;
      elevUpdated = 0;
    }
    
    //var latlon = scf.filters.mapCenterLatLon.getValue().replace(/\s+/g,'').split('/');
    //print(centroid);
    var point = centroid.coordinates().getInfo();
    var lat = point[1];
    var lon = point[0];
    Map.setCenter(lon, lat, 8);
    centerUpdated = 0;
    
    Map.layers().set(2, ui.Map.Layer(centroid, {color: 'FF0000'},'Center', 0));
    var scf_wcloud_mean = 100*scfImages[scfImage].reduceRegion(ee.Reducer.mean(), roi, 500).get('Snow_Cover_Daily_Tile_sum').getInfo();
    var scf_wcloud_min = 100*scfImages[scfImage].reduceRegion(ee.Reducer.min(), roi, 500).get('Snow_Cover_Daily_Tile_sum').getInfo();
    var scf_wcloud_max = 100*scfImages[scfImage].reduceRegion(ee.Reducer.max(), roi, 500).get('Snow_Cover_Daily_Tile_sum').getInfo();
    var scf_wcloud_stdev = 100*scfImages[scfImage].reduceRegion(ee.Reducer.stdDev(), roi, 500).get('Snow_Cover_Daily_Tile_sum').getInfo();    
    var scf_wcloud_median = 100*scfImages[scfImage].reduceRegion(ee.Reducer.median(), roi, 500).get('Snow_Cover_Daily_Tile_sum').getInfo();    
    scf_area = roi.area().getInfo()/(1000*1000);
    //var scf_nocloud = 100*scfImages_nocloud[scfImage].reduceRegion(ee.Reducer.mean(), point, 50).get('Snow_Cover_Daily_Tile_sum').getInfo();      
    scf.filters.scf_wcloud_mean.setValue('Mean SCF w/Cloud:\xa0\xa0\xa0' + scf_wcloud_mean.toFixed(2) + '%');
    scf.filters.scf_wcloud_min.setValue('Min SCF w/Cloud:\xa0\xa0\xa0' + scf_wcloud_min.toFixed(2) + '%');
    scf.filters.scf_wcloud_max.setValue('Max SCF w/Cloud:\xa0\xa0\xa0' + scf_wcloud_max.toFixed(2) + '%');    
    scf.filters.scf_wcloud_stdev.setValue('Stdev SCF w/Cloud:\xa0\xa0\xa0' + scf_wcloud_stdev.toFixed(2) + '%');    
    scf.filters.scf_wcloud_median.setValue('Median SCF w/Cloud:\xa0\xa0\xa0' + scf_wcloud_median.toFixed(2) + '%');    
    scf.filters.scf_area.setValue('Watershed Area:\xa0\xa0\xa0' + scf_area.toFixed(2) + 'km\u00B2');
    //print(scf_wcloud_min, scf_wcloud_max, scf_wcloud_stdev, scf_wcloud_median);
    //scf.filters.scf_nocloud.setValue('SCF noCloud:\xa0\xa0\xa0' + scf_nocloud.toFixed(2) + '%');
    elevation = DEM.reduceRegion(ee.Reducer.mean(), roi, 500).get('elevation').getInfo();
    scf.filters.elevation.setValue('Mean Elevation:\xa0\xa0' + elevation.toFixed(2) + 'm');
    
    //scf.transect(displaySCF);

    Map.onClick(function(coords) {
      var lat = coords.lat.toFixed(5).toString();
      var lon = coords.lon.toFixed(5).toString();
      //scf.filters.mapCenterLatLon.setValue(lat + ' / ' + lon);
      centerUpdated = 1;
      scf.setMapCenter();
    });

    return;
};

scf.genSCF = function() {
  var yr1;
  var mo1;
  alert('genSCF Begin processing SCF from 2000 - present ...\n\nPlease Click OK to Continue!');
  var startTime = new Date().getTime();
  for (var yr = yrStart; yr < yrEnd; yr++){
    for (var mo = 1; mo < 13; mo++) {
      var start = yr + '-' + ('0'+ mo).slice(-2) + '-01';
      if (mo == 12) {
        yr1 = yr + 1;
        mo1 = 1;
      }
      else {
        yr1 = yr;
        mo1 = mo + 1;
      }
      var end = yr1 + '-' + ('0'+ mo1).slice(-2) + '-01';
      //print(start, end);
      scf.getSCF(start, end);
    }
  }
  var endTime = new Date().getTime();
  //print(Object.keys(scfImages).length);
  alert('genSCF Completed processing SCF from 2000 - present. : ' + (endTime - startTime)/1000 + ' secs\n\nPlease Click OK to Continue!');
};

scf.makeChart = function(){
    var scfDict = {};
    var years = prompt("Please select year range to plot:", "2015 : 2016");
    years = years.replace(/\s+/g,'').split(':');

    alert('Remember Patience is a Virtue!!! ...\n\nPlease Click OK to Continue!');
    
    var roi = ROI.replace(/\s+/g,'').split('+')[0];
    var latlon = centroid.coordinates().getInfo();
    var latdeg = (latlon[1] >= 0) ? '\u00B0N' : '\u00B0S';
    var londeg = (latlon[0] >= 0) ? '\u00B0E' : '\u00B0W';
    var chartTitle = roi + ' WaterShed Mean SCF vs YearMonth \xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0Mean Elevation: ' + elevation.toFixed(2) + 'm\xa0\xa0\xa0\xa0\xa0\xa0\xa0Area: ' + scf_area.toFixed(2) + 'km\u00B2\xa0\xa0\xa0\xa0\xa0\xa0\xa0Lat: ' + latlon[1].toFixed(2) + latdeg + '\xa0\xa0 Lon: ' + Math.abs(latlon[0]).toFixed(2) + londeg;    
    var start = parseInt(years[0]);
    var end = parseInt(years[1]);

    for (var i = 0; i < nroi; i++) {
      if (roi == ee.Feature(WaterShedsFC_List.get(i)).get('Name').getInfo()) {
        var geo = ee.Feature(WaterShedsFC_List.get(i)).geometry();
        for (var yr = start; yr <= end; yr++) {
          for (var mo = 0; mo < 12; mo ++) {
            var mo1 = mo + 1;
            var ym = yr + ('0' + mo1).slice(-2);
            var scfImage = 'MODIS_SCF_' + ym;
            try {
              scfDict[ym] = 100*scfImages[scfImage].reduceRegion(ee.Reducer.mean(), geo, 500).get('Snow_Cover_Daily_Tile_sum').getInfo();
            }
            catch (err) {
              scfDict[ym] = -1;
            }
          }        
        }
      }
    }

    var scfKeys = ee.Dictionary(scfDict).keys();
    var scfArray = ee.Dictionary(scfDict).toArray();

    var scfChart = ui.Chart.array.values(scfArray, 0, scfKeys)
        .setSeriesNames(['SCF w/Cloud']);
    
    scfChart.setChartType('LineChart');
    
    scfChart.style().set({
        position: 'bottom-right',
        width: '500px',
        height: '300px'
    });
    
    scfChart.setOptions({
        title: chartTitle,
        hAxis: {
          title: 'YearMonth'
        },
        vAxis: {
          title: 'SCF (%)',
          minValue: 0,
          maxValue: 100
        },
        lineWidth: 1,
        pointSize: 3
    });
        
    // Add the chart to the map.    
    Map.add(scfChart);
    mapChart = scfChart;

};

scf.transectPlot = function(distance, elevationSCF, startPt, endPt){
  // Generate and style the chart.
  var dateRange = scf.filters.dateRange.getValue().split('/');  
  var plot = ui.Chart.array.values(elevationSCF, 1, distance.divide(1000))
    .setChartType('LineChart')
    .setSeriesNames(['Elevation', 'SCF'])
    .setOptions({
      title: 'Elevation and SCF along transect: Start=[' + startPt[1].toFixed(3) + ',' + startPt[0].toFixed(3) + ']\xa0\xa0\xa0End=[' + endPt[1].toFixed(3) + ',' + endPt[0].toFixed(3) + ']\xa0\xa0\xa0Period: ' + dateRange[0] + ' to ' + dateRange[1],
      vAxes: {
        0: {
          title: 'SCF (%)',
          titleTextStyle: {color: 'red'},
          textStyle: {color: 'red'}
        },
        1: {
          title: 'Elevation (meters)',
          titleTextStyle: {color: 'blue'},
          baselineColor: 'transparent',
          textStyle: {color: 'blue'}
        }
      },
      hAxis: {
        title: 'Distance from start to end (km)'
      },
      interpolateNulls: true,
      pointSize: 0,
      lineWidth: 1,
      // Our chart has two Y axes: one for temperature and one for elevation.
      // The Visualization API allows us to assign each series to a specific
      // Y axis, which we do here:
      series: {
        0: {targetAxisIndex: 1},
        1: {targetAxisIndex: 0},
        2: {targetAxisIndex: 0}
      }
    });

  print(plot);
};

scf.exportImage = function() {
  //try {
    var ym = scf.filters.dateRange.getValue();
    var scfImage = 'MODIS_SCF_' + ym;
    var layers = prompt("Please select layers to export:", "SCFcloud, DEM");
    var bands = layers.replace(/\s+/g,'').split(',');
    var nbands = ee.List(bands).length().getInfo();
    var xbands = 'exportROI';
    for (var i = 0; i < nbands; i++) {
      xbands += '_'+bands[i];
    }
    
    var geo;
    var states = ROI.replace(/\s+/g,'').split('+');
    var nstates = states.length;
    if (nstates > 1) {
      geo = WaterShedsFC.first().geometry();
    }
    else {
      for (i = 0; i < nroi; i++) {
        if (states[0] == ee.Feature(WaterShedsFC_List.get(i)).get('Name').getInfo()) {
          geo = ee.Feature(WaterShedsFC_List.get(i)).geometry();
        }
      }
    }

    var displaySCF;
    for (i = 0; i < nbands; i++) {
      if (i === 0) {
        switch (bands[0]) {
          case 'SCFcloud': 
            displaySCF = scfImages[scfImage];
            break;
          //case 'SCFncloud': 
            //displaySCF = scfImages_nocloud[scfImage];
            //break;
          //case 'SCFQA': 
            //displaySCF = scfqaImages[scfImage];
            //break;
          case 'DEM': 
            displaySCF = DEM.toFloat();
            break;
          default:
            alert('No layers named '+band[0]);
        }
      }
      else {
        switch (bands[i]) {
          case 'SCFcloud': 
            displaySCF = displaySCF.addBands(scfImages[scfImage]);
            break;
          //case 'SCFncloud': 
            //displaySCF = displaySCF.addBands(scfImages_nocloud[scfImage]);
            //break;
          //case 'SCFQA': 
            //displaySCF = displaySCF.addBands(scfqaImages[scfImage]);
            //break;
          case 'DEM': 
            displaySCF = displaySCF.addBands(DEM).toFloat();
            break;
          default:
            alert('No layers named '+band[i]);
        }
      }
    }
    
    var exportROI = ee.Geometry.Polygon(geo.buffer(10000).coordinates()).bounds();
    print(exportROI);

    //var displaySCF = scfImages[scfImage].addBands(scfImages_nocloud[scfImage]).addBands(DEM.toFloat());
    var projection = prompt("Please enter projection", "EPSG:3857");
    Export.image.toDrive({
      image: displaySCF,
      description: xbands,
      scale: 500,
      crs: projection,
      region: exportROI
    });

  //}
  //catch (err) {
    //alert('Could not export image!\nMake sure an "exportROI" polygon is defined on the map!');
  //}
};

scf.transect = function(displaySCF) {
  try {
    var startPt = transect.coordinates().get(0).getInfo();
    var endPt = transect.coordinates().get(1).getInfo();
    var p2p_distance = ee.Geometry.Point(startPt).distance(ee.Geometry.Point(endPt)).getInfo();
    //print(startPt, endPt, p2p_distance);
    var startPtFC = ee.FeatureCollection(ee.Geometry.Point(startPt));
    var transectDist = startPtFC.distance(p2p_distance);
    var elevation = ee.Image(DEM);
    var distImage = transectDist.addBands(elevation).addBands(displaySCF.unmask());
    //print(startPtFC, transectDist, distImage);
    // Extract band values along the transect line.
    var distArray = distImage.reduceRegion(ee.Reducer.toList(), transect, 500).toArray(distImage.bandNames());

    // Sort points along the transect by their distance from the starting point.
    var distances = distArray.slice(0, 0, 1);
    distArray = distArray.sort(distances);

    // Create arrays for charting.
    var elevationSCF = distArray.slice(0, 1);  // For the Y axis.
    // Project distance slice to create a 1-D array for x-axis values.
    var distance = distArray.slice(0, 0, 1).project([1]);
    //distance = distance.map(function(x) {return x/1000;});
    //print(distArray, distance, elevationSCF);
    scf.transectPlot(distance, elevationSCF, startPt, endPt);
  }
  catch (err) {
    
  }
};

scf.filters = {
    dateRange : ui.Textbox('YearMonth','201501', function(){dateUpdated = 1; return;}),
    elevRange : ui.Textbox('All', 'All', function(){elevUpdated = 1; return}),
    elevation : ui.Label('Elevation:\xa0\xa0m'),
    scf_area: ui.Label('Watershed Area:\xa0\xa0km\u00B2'),
    scf_wcloud_mean : ui.Label('Mean SCF w/Cloud:\xa0\xa0%'),
    scf_wcloud_min : ui.Label('Min SCF w/Cloud:\xa0\xa0%'),
    scf_wcloud_max : ui.Label('Max SCF w/Cloud:\xa0\xa0%'),
    scf_wcloud_stdev : ui.Label('Stdev SCF w/Cloud:\xa0\xa0%'),
    scf_wcloud_median : ui.Label('Median SCF w/Cloud:\xa0\xa0%'),
    applyButton: ui.Button('Apply', scf.setMapCenter),
    scfChart: ui.Button('Plot Mean Watershed SCF vs YearMonth', scf.makeChart),
    scfExportImage: ui.Button('Export Image', scf.exportImage)
};

scf.filters.panel = ui.Panel({
    widgets:[
      ui.Label({
        value:'Date Range :', 
        style: {fontWeight: 'bold'}}), scf.filters.dateRange,
      ui.Label({
        value:'Water Shed ROI :',
        style: {fontWeight: 'bold'}}),
      ui.Select({
        items: [
                {label: 'All'     , value: 'All'},
                {label: 'Aragon'  , value: 'Aragon'  },
                {label: 'JohnDay' , value: 'JohnDay'},
                {label: 'LaLaguna', value: 'LaLaguna'},
                {label: 'ring10k' , value: 'ring10k'},
                {label: 'ring30k' , value: 'ring30k'},
               ],
        placeholder: 'Select Watershed ROI...',
        onChange: function(value) {
          if (value == 'All') value = ROIs;
          ROI = value;
          stateUpdated = 1;
        }
      }),
      ui.Label({
        value:'Elev Range (low/high) :',
        style: {fontWeight: 'bold'}}), scf.filters.elevRange,
      ui.Label(''), scf.filters.elevation,
      ui.Label(''), scf.filters.scf_area,
      ui.Label(''), scf.filters.scf_wcloud_mean,
      ui.Label(''), scf.filters.scf_wcloud_min,
      ui.Label(''), scf.filters.scf_wcloud_max,
      ui.Label(''), scf.filters.scf_wcloud_stdev,
      ui.Label(''), scf.filters.scf_wcloud_median,
      scf.filters.applyButton,
      scf.filters.scfChart,
      scf.filters.scfExportImage
    ]
});

scf.getSCF = function(start, end){
    //var year = start.slice(0,4);
    var start1 = end;
    var end1 = ee.Date(end).advance(30,'day');
    var scfImage = 'MODIS_SCF_' + start.slice(0,4) + start.slice(5,7);
    //print(scfImage);
    //////////////////////// SATELLITE DATA  ///////////////////////////////// 
    // Pull the images from the MODIS/Terra Daily Snow Cover product.
    
    var MODIS_valid_collection = ee.ImageCollection("MOD10A1")
      // Filter by the desired date range (defined above).
      .filterDate(start,end)
      .filterBounds(WaterShedsFC)
      // Use the ee.image.map function to return a valid-only value within the image collection.
      // I created this function, it is not a pre-cooked GEE function.
      .map(function(img) {
        // Use the ee.image.expression to create a boolean expression that selects only the valid values
        // and pulls them from the band in question, 'Snow_Cover_Daily_Tile'.
        return img.expression("(BAND==200||BAND==25||BAND==50)",{BAND:img.select('Snow_Cover_Daily_Tile')})});


    // Pull the images from the MODIS/Terra Daily Snow Cover product.
    var MODIS_snow_collection = ee.ImageCollection("MOD10A1")
      // Filter by the desired date range.
      .filterDate(start,end)
      .filterBounds(WaterShedsFC)
      // Use the ee.image.map function to return a snow-only value within the image collection.
      // I created this function, it is not a pre-cooked GEE function.
      .map(function(img) {
    // Use the ee.image.expression to create a boolean expression that selects only the snow values
    // and pulls them from the band in question, 'Snow_Cover_Daily_Tile'.
    return img.expression("(BAND==200)",{BAND:img.select('Snow_Cover_Daily_Tile')})});

    // When you print variables or arguments, it prints to the console on the right. 
    // It prints information about the variable or returned product from the function.
    //print(MODIS_snow_collection, 'MODIS_snow_collection');

    /////////////////////////// REDUCERS  ///////////////////////////////////////////
    // This portion of the code allows you to drill through multiple bands in an image
    // or image collection in order to create a single value across the date range.
    // For example, if there are 30 days in the date range, then the product of the 
    // two functions above is an image collection with 30 stacked images. The pre-cooked
    // reduce function drills through all 30 layers and returns a 1-band image with some
    // calculated product at the pixel level.

    // Reduce the image collection by the valid sum.
    var valid = MODIS_valid_collection.reduce(ee.Reducer.sum());
    //print(valid, 'valid');

    // Reduce the image collection by the snow sum.
    var snow = MODIS_snow_collection.reduce(ee.Reducer.sum());
    //print(snow, 'snow');
    var snow0 = snow;

    // Get list of only cloud images from start to end date
    var MODIS_snow_list1 = ee.ImageCollection("MOD10A1")
      .filterDate(start1,end1)
      .filterBounds(WaterShedsFC)
      .map(function(img) {
        return img.expression("(BAND==200)",{BAND:img.select('Snow_Cover_Daily_Tile')})})
      .toList(40);
      
    var MODIS_cloud_list1 = ee.ImageCollection("MOD10A1")
      .filterDate(start1,end1)
      .filterBounds(WaterShedsFC)
      .map(function(img) {
        return img.expression("(BAND==50)",{BAND:img.select('Snow_Cover_Daily_Tile')})})
      .toList(40);
    /***  
    var MODIS_nosnow_list1 = ee.ImageCollection("MOD10A1")
      .filterDate(start1,end1)
      .filterBounds(WaterShedsFC)
      .map(function(img) {
        return img.expression("(BAND==25)",{BAND:img.select('Snow_Cover_Daily_Tile')})})
      .toList(40);
    ***/
    var MODIS_cloud_list = ee.ImageCollection("MOD10A1")
      .filterDate(start,end)
      .filterBounds(WaterShedsFC)
      .map(function(img) {
        return img.expression("(BAND==50)",{BAND:img.select('Snow_Cover_Daily_Tile')})})
      .toList(40);

    var MODIS_snow_list = ee.ImageCollection("MOD10A1")
      .filterDate(start,end)
      .filterBounds(WaterShedsFC)
      .map(function(img) {
        return img.expression("(BAND==200)",{BAND:img.select('Snow_Cover_Daily_Tile')})})
      .toList(40);
    /*** 
    var MODIS_snow_nosnow_list = ee.ImageCollection("MOD10A1")
      .filterDate(start,end)
      .filterBounds(WaterShedsFC)
      .map(function(img) {
        return img.expression("(BAND==200||BAND==25)",{BAND:img.select('Snow_Cover_Daily_Tile')})})
      .toList(40);
    ***/  
    //var MODIS_scfqa_list = ee.ImageCollection("MOD10A1")
      // Filter by the desired date range (defined above).
      //.filterDate(start,end)
      //.filterBounds(WaterShedsFC)
      //.map(function(img) {
        //return img.select('Snow_Spatial_QA')})
      //.toList(40);
      
    // Get number of days  
    var ndays = MODIS_cloud_list.length().getInfo();
    print('Processing ' + ndays + ' days in ' + start.slice(0,4) + start.slice(5,7));
    
    //var MODIS_scfqa = ee.Image(0);
    //for (var i = 0; i < ndays; i++) {
      //MODIS_scfqa = MODIS_scfqa.add(ee.Image(MODIS_scfqa_list.get(i)).unmask());
    //}
    //MODIS_scfqa = ee.Image(1).subtract(MODIS_scfqa.divide(ee.Image(ndays)));

    //var MODIS_snow_end = ee.Image(0);
    var ndays1 = MODIS_snow_list1.length().getInfo();
    /***
    for (var i = ndays1 - 1; i >= 0; i--) {
      MODIS_snow_end = MODIS_snow_end.where(ee.Image(MODIS_snow_list1.get(i)).unmask().eq(1), 1);
      MODIS_snow_end = MODIS_snow_end.where(ee.Image(MODIS_nosnow_list1.get(i)).unmask().eq(1), 0);
    }
    ***/
    //This server loop doesn't work yet
    //var serverLoop = ee.List.sequence(ndays1 - 1, 0, -1);
    //serverLoop = serverLoop.map(function(n) {
      //MODIS_snow_end = MODIS_snow_end.where(ee.Image(MODIS_snow_list1.get(ee.Number(n))).unmask().eq(1), 1);
      //MODIS_snow_end = MODIS_snow_end.where(ee.Image(MODIS_nosnow_list1.get(ee.Number(n))).unmask().eq(1), 0);
      //return MODIS_snow_end;
    //})

    // Retrieve initial cloud image
    /***
    var MODIS_snowcloud_days = ee.Image(MODIS_cloud_list.get(0)).unmask();
    
    // Loop from start+1 to end on snowcloud_days.
    var MODIS_incsnow;
    var MODIS_snow_nosnow_days;
    for (i = 1; i < ndays; i++) {
      MODIS_incsnow = MODIS_snowcloud_days.multiply(ee.Image(MODIS_snow_list.get(i)).unmask());
      snow = snow.add(MODIS_incsnow);
      MODIS_snow_nosnow_days = MODIS_snowcloud_days.multiply(ee.Image(MODIS_snow_nosnow_list.get(i)).unmask());
      MODIS_snowcloud_days = (MODIS_snowcloud_days.subtract(MODIS_snow_nosnow_days))
        .add(ee.Image(MODIS_cloud_list.get(i)).unmask());
    }
    MODIS_incsnow = MODIS_snowcloud_days.multiply(MODIS_snow_end);
    snow = snow.add(MODIS_incsnow);
    ***/
    var count_ena = ee.Image(0);
    var i;
    for(i=ndays1-1; i>=0; i--) {
      count_ena = count_ena.and(ee.Image(MODIS_cloud_list1.get(i)).unmask()).or(ee.Image(MODIS_snow_list1.get(i)).unmask());
    }

    for(i=ndays-1; i>0; i--) {
      snow = snow.add((ee.Image(MODIS_cloud_list.get(i)).unmask()).multiply(count_ena));
      count_ena = (ee.Image(MODIS_cloud_list.get(i)).unmask()).and(count_ena);
      count_ena = count_ena.or((ee.Image(MODIS_snow_list.get(i)).unmask()).and(ee.Image(MODIS_cloud_list.get(i-1)).unmask()));
    }
    snow = snow.add((ee.Image(MODIS_cloud_list.get(0)).unmask()).and(count_ena));
    ///////////////////////////  IMAGE CALCULATION  ////////////////////////////////
    // This function allows you to divide the values from one image by the values 
    // in another image. This is the simplicity of Snow Cover Frequency algorithm.
    //scfImages[scfImage] = snow.divide(valid).updateMask(snow);
    scfImages[scfImage] = snow.divide(valid);
    
};

/** Creates the application interface. */
scf.boot = function() {
  /////////////////////////  DATE RANGE  //////////////////////////////////
  // First, create variables for the date range.
  // There are many ways to do this, and I have not figured out the best way yet.
  // To change the date range of analysis, simply change the date below.
  // Set filter variables.
  
  WaterShedsFC_List = WaterShedsFC.toList(100);
  nroi = WaterShedsFC_List.length().getInfo();
  //print(nroi);
  ROIs = '';
  for (var i = 0; i < nroi; i++) {
    ROIs += ee.Feature(WaterShedsFC_List.get(i)).get('Name').getInfo();
    if (i < nroi - 1) ROIs += '+';
  }
  //print(ROIs);
  scf.genSCF();

  var main = ui.Panel({
    widgets: [
      scf.filters.panel
    ]
  });
  
  ui.root.insert(0, main);
};

scf.boot();

// Set the default map's cursor to a "crosshair".
Map.style().set('cursor', 'crosshair');

alert('Please select ROI and other input options and press \'Apply Inputs\', but first\n\n \xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0\xa0Press OK to continue!');

