// This code is the property of Oregon State University Mountain Hydroclimatology Research Group
// Please contact Dr. Anne Nolin for any inquiries: nolina@oregonstate.edu

// This JavaScript code is written to be executed in Google Earth Engine. For access to Google Earth Engine, the user must fill out the following form (This is a Google stipulation)
//  https://earthengine.google.com/signup

// Once you have access to GEE, follow these instructions.

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
//                 web mapping applications (Google/Bing/OpenStreetMap/etc). AKA EPSG:900913. 
//
