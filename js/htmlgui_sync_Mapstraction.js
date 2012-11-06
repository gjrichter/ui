/**********************************************************************
	 htmlgui_sync_Mapstraction.js

$Comment: provides an interface to Mapstratcion API functions to svggis
$Source : htmlgui_sync_Mapstratcion.js,v $

$InitialAuthor: guenter richter $
$InitialDate: 2010/09/19 $
$Author: guenter richter $
$Id: htmlgui_sync_Mapstratcion.js 1 2010-09-19 22:51:41Z Guenter Richter $

Copyright (c) Guenter Richter
$Log: htmlgui_sync_Mapstratcion.js,v $
**********************************************************************/

/** 
 * @fileoverview This file provides an interface to the Mapstraction API for html maps. It maps htmlgui calls to the Mapstration API<br>
 * @author Guenter Richter guenter.richter@medienobjekte.de
 * @version 1.0 
 */

/**
 * define namespace ixmaps
 */

(function( ixmaps, $, undefined ) {

	ixmaps.htmlMap_Api = "Mapstraction";

	/* ------------------------------------------------------------------ * 
			local variables
	 * ------------------------------------------------------------------ */

	var mapstraction = null;
	var geocoder = null;
	var ptLatLonInitGMap = null;
	var newZoomInitGMap = null;

	var mapstraction;

	ixmaps.loadGMap = function(szMapService) {

		if ( !mxn || !this.szGmapDiv ){
			return;
		}
		if ( (typeof(szMapService) == "undefined") || (szMapService.length == 0) ){
			szMapService = "openlayers";
		}
		mapstraction = new mxn.Mapstraction(this.szGmapDiv,szMapService);

		mapstraction.changeZoom.addHandler(function(n, s, a) { htmlgui_synchronizeSVG() });
		mapstraction.endPan.addHandler(function(n, s, a) { htmlgui_panSVGEnd();htmlgui_synchronizeSVG(); });
		mapstraction.doPan.addHandler(function(n, s, a) { htmlgui_panSVG(); });

		mapstraction.addControls({
			pan: false, 
			zoom: 'small',
			map_type: true
			});

		if ( szMapService == "leaflet" ){
		  mapstraction.addTileLayer("http://{s}.google.com/vt/?hl=en&x={x}&y={y}&z={z}&s={s}", {
			 name: "Street",
			 attribution: "Map data: Copyright Google, 2011",
			 subdomains: ['mt0','mt1','mt2','mt3']
		  });
			/**
		  mapstraction.addTileLayer("http://{s}.tile.cloudmade.com/8280c6eed82b4bb8a62b5ab47725925f/997/256/{z}/{x}/{y}.png", {
			 name: "cloudmade",
			 attribution: "Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade",
			 subdomains: ['a','b','c']
		  });
		  999 = midnight commander
		  mapstraction.addTileLayer("http://{s}.tile.cloudmade.com/8280c6eed82b4bb8a62b5ab47725925f/999/256/{z}/{x}/{y}.png", {
			 name: "simple",
			 attribution: "Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade",
			 subdomains: ['a','b','c']
		  });
		  **/
		}

	return mapstraction;
	}

	/* ------------------------------------------------------------------ * 
		Synchronization of SVG and Google map
	* ------------------------------------------------------------------ */

	/** 
	 * interchange format of bounds is an array of 2 lat/lon point objects
	 * array({lat:p1.lat,lng:p1.lng},{lat:p2.lat,lng:p2.lng}); 
	 * p1 = south/west point; p2 = north/east point
	 */

	htmlMap_getZoom = function(){
		return mapstraction.getZoom();
	}
	htmlMap_setZoom = function(nZoom){
		return mapstraction.setZoom(nZoom);
	}
	xhtmlMap_getCenter = function(){
		var center = mapstraction.getCenter();
		return {lat:center.lat,lng:center.lng};
	}
	htmlMap_getCenter = function(){
		var bounds = mapstraction.getBounds();
		var swPoint = bounds.getSouthWest();
		var nePoint = bounds.getNorthEast();
		return {lat:swPoint.lat+(nePoint.lat-swPoint.lat)/2,lng:swPoint.lng+(nePoint.lng-swPoint.lng)/2};
	}

	htmlMap_getBounds = function(){
		var bounds = mapstraction.getBounds();
		var swPoint = bounds.getSouthWest();
		var nePoint = bounds.getNorthEast();
		return new Array({lat:swPoint.lat,lng:swPoint.lng},{lat:nePoint.lat,lng:nePoint.lng});
	}

	htmlMap_setCenter = function(ptLatLon){
		mapstraction.setCenter(
			new mxn.LatLonPoint(ptLatLon.lat,
								ptLatLon.lng) , {pan:true}
		);		
	}

	htmlMap_setBounds = function(arrayPtLatLon){

		if (arrayPtLatLon && (arrayPtLatLon.length == 2) ){
			var dLat = (arrayPtLatLon[0].lat - arrayPtLatLon[1].lat)*0.1;
			var dLng = (arrayPtLatLon[1].lng - arrayPtLatLon[0].lng)*0.1;
			ixmaps.embeddedSVG.window._TRACE("<========= htmlgui: do adapt HTML map ! to sw:"+arrayPtLatLon[0].lat+","+arrayPtLatLon[0].lng+" ne:"+arrayPtLatLon[1].lat+","+arrayPtLatLon[1].lng);

			mapstraction.setBounds(
				new mxn.BoundingBox(arrayPtLatLon[0].lat-dLat,
									arrayPtLatLon[0].lng+dLng,
									arrayPtLatLon[1].lat-dLat,
									arrayPtLatLon[1].lng+dLng
				)
			);		
			mapstraction.setCenter(
				new mxn.LatLonPoint(arrayPtLatLon[1].lat + (arrayPtLatLon[0].lat - arrayPtLatLon[1].lat)/2,
									arrayPtLatLon[0].lng + (arrayPtLatLon[1].lng - arrayPtLatLon[0].lng)/2 ),{pan:true}
			);		
		}
	}

	htmlMap_setSize = function(width,height){
		mapstraction.resizeTo(width,height);
	}
	
	htmlMap_getMapTypeId = function(){
		return null;		
	}

	/* ------------------------------------------------------------------ * 
		Google maps search functions
	* ------------------------------------------------------------------ */

	function showAddress(address) {
		if ( !address.match(",") ){
		  address += ", San Benedetto del Tronto, Italia";
		}
		if (geocoder) {
			geocoder.getLatLng(
				address,
				function(point) {
					if (!point) {
						alert(address + " not found");
					} else {
						gmap.setCenter(point, 17);
						var marker = new GMarker(point);
						gmap.addOverlay(marker);
						marker.openInfoWindowHtml(address+"</br>"+point.lat()+","+point.lng());
						synchronizeParentMap();
					}
				}
			);
		}
	}

	/* ------------------------------------------------------------------ * 
		Google Maps api functions
	* ------------------------------------------------------------------ */

	// addAddressToMap() is called when the geocoder returns an
	// answer.  It adds a marker to the map with an open info window
	// showing the nicely formatted version of the address and the country code.
	function addAddressToMap(response) {
		if (!response || response.Status.code != 200) {
			alert("Sorry, we were unable to geocode that address");
		} else {
			place = response.Placemark[0];
			point = new GLatLng(place.Point.coordinates[1],
													place.Point.coordinates[0]);
			embeddedSVG.window.map.Api.doCenterMapToGeoPosition(place.Point.coordinates[1],place.Point.coordinates[0])
		}
	}

	// showLocation() is called when you click on the Search button
	// in the form.  It geocodes the address entered into the form
	// and adds a marker to the map at that location.
	function showLocation() {
		var searchForm  = window.document.getElementById("MapSearchForm");
		var address = searchForm.query.value + "," + __GoogleAddressSearchSuffix;
		geocoder.getLocations(address, addAddressToMap);
	}

	function mypoint(x,y) {
		this.x = x;
		this.y = y;
		}

	function htmlgui_getGeocode(szAddress) {
		if (geocoder) {
			var retCode = 0;
			var ptResult = null;
			geocoder.getLatLng(
				szAddress,
				function(point) {
					if (!point) {
						retCode = -1;
					} else {
						retCode = 1;
						ptResult = new mypoint(point.lng(),point.lat());
					}
				}
			);
			while ( retCode == 0 ){
				;
			}
			return ptResult;
		}
		return null;
	}

}( window.ixmaps = window.ixmaps || {}, jQuery ));

// .............................................................................
// EOF
// .............................................................................

