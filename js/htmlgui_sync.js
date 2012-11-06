/**********************************************************************
	 htmlgui_sync.js

$Comment: provides html basemap sync functiuons to the svggis htmlgui
$Source : htmlgui_sync.js,v $

$InitialAuthor: guenter richter $
$InitialDate: 2010/09/19 $
$Author: guenter richter $
$Id: htmlgui_sync.js 1 2010-09-19 22:51:41Z Guenter Richter $

Copyright (c) Guenter Richter
$Log: htmlgui_sync.js,v $
**********************************************************************/

/** 
 * @fileoverview This file provides interface functions for map synchronisatation. Calls html map functions which must be resolved by base map specific javascript (e.s. htmlgui_sync_GoogleV3.js)<br>
 * @author Guenter Richter guenter.richter@medienobjekte.de
 * @version 1.0 
 */

(function( ixmaps, $, undefined ) {

/* ------------------------------------------------------------------ * 
	Synchronization of SVG and Google map
* ------------------------------------------------------------------ */

	/** share mouse events between HTML and SVG
	 *  because only one hosting <div> can have events, either the HTML map or the SVG map,
	 *  the event ability of the SVG, which is on top, has to be switched according to the 
	 *  selected tool and the position of the pointer, expl. if poiunter is on map background,
	 *  event is switcht to the html map for a tetermined time window
	 */
	var fSVGTriggerEvent = false;
	var fEnableAutoDisable = false;
 	var fEnableEventsOnSVG = true;
 	var fEnableSwitchEvents = true;
	var fBlockSVGMapEvents = false;
	var fEventsOnSVG = true;

	__activateSVGElements = function(flag,mouseevent){

		if ( !fEnableSwitchEvents ){
			return;
		}
		$("#svgmapdiv").css("pointer-events",(flag?"all":"none"));
		if (!flag){
			fSVGTriggerEvent = true;
		}
	};
	ixmaps.do_mapmousedown = function(){
		fEnableEventsOnSVG = false;
	};
	ixmaps.do_mapmouseup = function(){
		fEnableEventsOnSVG = true;
	};
	ixmaps.do_mapmouseout = function(){
		if (fEnableEventsOnSVG)	{
			__activateSVGElements(true);
			fEnableAutoDisable = false;
		}
	};
	ixmaps.do_mapmouseover = function(){
		if (fEnableEventsOnSVG)	{
			__activateSVGElements(false);
			fEnableAutoDisable = true;
		}
	};
	var nMapMouseMove = 0;
	ixmaps.do_mapmousemove = function(){
		return;
		/*
		if ( ++nMapMouseMove > 300 ){
			nMapMouseMove = 0;
			if (fEnableEventsOnSVG)	{
				__activateSVGElements(true);
			}
		}
		*/
	};
	ixmaps.do_svgtriggerevent = function(){
		fSVGTriggerEvent = false;
	};

	do_enableSVG = function(){
		if (fEnableEventsOnSVG && !fBlockSVGMapEvents )	{
			__activateSVGElements(true);
			setTimeout("do_disableSVG()",25);
		}
		setTimeout("do_enableSVG()",250);
	};
	do_disableSVG = function(){
		if (fEnableAutoDisable )	{
			__activateSVGElements(false);
		}
	};
	ixmaps.do_keydown = function(evt){
		if ( evt.keyCode == 16 ){
			__activateSVGElements(!fEventsOnSVG);
 			fEnableSwitchEvents = false;
		}
	};
	ixmaps.do_keyup = function(evt){
		if ( evt.keyCode == 16 ){
 			fEnableSwitchEvents = true;
			__activateSVGElements(true);
		}
	};
	
/* ------------------------------------------------------------------ * 
	synchronize envelope between HTML and SVG
* ------------------------------------------------------------------ */

	var synchronizeTimeout = null;
	var fOrigDragSVGHidden = false;
	var fDragSVGHidden = true; // fOrigDragSVGHidden;
	var nLastSynchZoom = null;

/**
** synchronize HTML map to the actual SVG bounds
**/
	ixmaps.htmlgui_synchronizeMap = function(callback,zoomto){

		if ( !window || !ixmaps.embeddedSVG || !this.htmlMap ){
			return;
		}
		try{
			ixmaps.embeddedSVG.window._TRACE("=========> htmlgui: htmlgui_synchronizeMap() callback="+callback+" zoomto="+zoomto);
		}catch (e){}

		// ok, go ahead and sync the HTML map
		//
		try{
			ixmaps.embeddedSVG.window._TRACE("=========> htmlgui: request to synchronize HTML map ! ==>    ==>    ==>   ==>    ==>");
		}catch (e){}

		try{
			var arrayPtLatLon = getBoundsLatLon();
				ixmaps.embeddedSVG.window._TRACE("<========= htmlgui: request to adapt HTML map ! to sw:"+arrayPtLatLon[0].lat+","+arrayPtLatLon[0].lng+" ne:"+arrayPtLatLon[1].lat+","+arrayPtLatLon[1].lng);
			if (arrayPtLatLon && (arrayPtLatLon.length == 2) ){
				if (zoomto){
					htmlMap_setBounds(arrayPtLatLon);
				}else{
					htmlMap_setCenter({lat:(arrayPtLatLon[1].lat + (arrayPtLatLon[0].lat - arrayPtLatLon[1].lat)/2),
									   lng:(arrayPtLatLon[0].lng + (arrayPtLatLon[1].lng - arrayPtLatLon[0].lng)/2)});
				}
			}
		}catch (e){}

		setTimeout("ixmaps.HTML_showMap()",10);
	};

/**
** synchronize SVG map the actual HTML bounds
** is called by the HTML map event handling (bounds_changed,changeZoom,...)
**/
	htmlgui_synchronizeSVG = function(fPanOnly) {

		// avoid to frequent syncs and sync only after 150 ms;
		// privileges dragging of the html map over SVG sync
		//
		if (synchronizeTimeout){
			clearTimeout(synchronizeTimeout);
		}
		synchronizeTimeout = setTimeout("__delayedSynchronizeSVG("+String(fPanOnly)+")",150);
	};
	// check if events on SVG are enabled 
	// this is done, to privilege the html map handling
	__delayedSynchronizeSVG = function(fPanOnly) {
		if (fEnableEventsOnSVG){
			__doSynchronizeSVGMap(fPanOnly);
		}
		synchronizeTimeout = null;
	};
	// here we go   
	//
	function __doSynchronizeSVGMap(fPanOnly) {

		if ( !window ){
			return;
		}

		if ( !ixmaps.htmlMap ){
			return;
		}

		// get the HTML map bounds
		var arrayPtLatLon = htmlMap_getBounds();
		var nZoom = htmlMap_getZoom();

		try{
			ixmaps.embeddedSVG.window._TRACE("<========= htmlgui: request to adapt SVG map ! to sw:"+arrayPtLatLon[0].lat+","+arrayPtLatLon[0].lng+" ne:"+arrayPtLatLon[1].lat+","+arrayPtLatLon[1].lng);
			ixmaps.embeddedSVG.window._TRACE("           htmlgui: html map zoom:"+ nZoom);
			ixmaps.embeddedSVG.window._TRACE("           htmlgui:          fPan:"+ fPan);
		}catch (e){}

		// get the HTML map center
		var ptLatLon = htmlMap_getCenter();
		var ptBlat = arrayPtLatLon[0].lat+(arrayPtLatLon[1].lat-arrayPtLatLon[0].lat)/2;
		var ptBlng = arrayPtLatLon[0].lng+(arrayPtLatLon[1].lng-arrayPtLatLon[0].lng)/2;
		try{
			ixmaps.embeddedSVG.window._TRACE("           htmlgui:  Center = lat:"+ptLatLon.lat+" lon:"+ptLatLon.lng);
			ixmaps.embeddedSVG.window._TRACE("           htmlgui: bCenter = lat:"+ptBlat+" lon:"+ptBlng);
		}catch (e){}

		// do some coordinate smoothing
		// wrap center lat between -180 and 180
		while ( ptLatLon.lng < -180 ){
			ptLatLon.lng += 360;
		}
		while ( ptLatLon.lng > 180 ){
			ptLatLon.lng -= 360;
		}

		// wrap bounds around wrapped center
		while ( arrayPtLatLon[0].lng > ptLatLon.lng ){
			arrayPtLatLon[0].lng -= 360;
			}
		while ( arrayPtLatLon[1].lng < ptLatLon.lng ){
			arrayPtLatLon[1].lng += 360;
		}
		while ( arrayPtLatLon[0].lng < ptLatLon.lng - 360 ){
			arrayPtLatLon[0].lng += 360;
			}
		while ( arrayPtLatLon[1].lng > ptLatLon.lng + 360 ){
			arrayPtLatLon[1].lng -= 360;
		}
		/***
		// GR 07.05.2012 killed // &&, because not working, charts has not been actualized !
		// see if we only have panning
		if ( nLastSynchZoom && (nZoom == nLastSynchZoom ) ){
			fPanOnly = true;
		}
		nLastSynchZoom = nZoom;
		***/

		// set SVG map bounds
		if ( fPanOnly ){
			setBoundsLatLonSilent(
				arrayPtLatLon[0].lat,
				arrayPtLatLon[0].lng,
				arrayPtLatLon[1].lat,
				arrayPtLatLon[1].lng);

		}else{
			setBoundsLatLon(
				arrayPtLatLon[0].lat,
				arrayPtLatLon[0].lng,
				arrayPtLatLon[1].lat,
				arrayPtLatLon[1].lng);
		}

		try{
			ixmaps.embeddedSVG.window._TRACE("           htmlgui: request to adapt SVG map ! to sw:"+arrayPtLatLon[0].lat+","+arrayPtLatLon[0].lng+" ne:"+arrayPtLatLon[1].lat+","+arrayPtLatLon[1].lng);
			ixmaps.embeddedSVG.window._TRACE("           htmlgui: html map zoom:"+ nZoom);
		}catch (e){}

		// try to sync slave maps
		if ( ixmaps.fSync && (ixmaps.fSync == true) ){
			try{
				ixmaps.syncSlaveMap(arrayPtLatLon[0],
									arrayPtLatLon[1],htmlMap_getZoom());
			}catch (e){}
		}
		ixmaps.fSync = true;

		// make shure to show the svg map, may has been hidden before
		// if dragg in hidden mode, show SVG map
		//
		if ( fDragSVGHidden ){
			var elapsedTime = __timer_getMS();
			// test, if dragging hidden still needed
			if ( 0 && elapsedTime < 1000 ){
				fDragSVGHidden = fOrigDragSVGHidden;
			}
		}

		// set visibility status after SVG syncronization 
		// in initialization phase, the SVG map is hidden, so make it visible when synchronized 
		showAll();
		ixmaps.HTML_hideLoading();
		// finish hiding HTML map on initialize

		setTimeout("ixmaps.HTML_showMap()",1000);
	}


/* ------------------------------------------------------------------ * 
	synchronise dragging
* ------------------------------------------------------------------ */

	htmlgui_panSVGStart = function() {
		if (synchronizeTimeout){
			clearTimeout(synchronizeTimeout);
		}
		if ( fDragSVGHidden ){
			hideAll();
		}
	};
	htmlgui_panSVGEnd = function() {
		if ( fDragSVGHidden ){
			htmlgui_synchronizeSVG();
		}
	};

	// GR 16.03.2012 now bounds used also for panning, cause: problems with zoom level 1
	/**
	htmlgui_panSVGold = function() {

		if ( fDragSVGHidden ){
			hideAll();
			return;
		}
		if ( !window ){
			return;
		}

		// get center of HTML map
		var ptLatLon = htmlMap_getCenter();

		// do some coordinate smoothing
		// wrap center lat between -180 and 180
		while ( ptLatLon.lng < -180 ){
			ptLatLon.lng += 360;
		}
		while ( ptLatLon.lng > 180 ){
			ptLatLon.lng -= 360;
		}
		// set SVG map center
		var time = setBoundsLatLonSilent(	ptLatLon.lat,
											ptLatLon.lng,
											ptLatLon.lat,
											ptLatLon.lng);

		// if dragging takes to much time, hide the SVG on start dragging
		//
		if ( time > 100 ){
			hideAll();
			fDragSVGHidden = true;
		}
	};
	**/
	htmlgui_panSVG = function() {

		if ( fDragSVGHidden ){
			hideAll();
			return;
		}
		if ( !window ){
			return;
		}

		// get the HTML map bounds
		var arrayPtLatLon = htmlMap_getBounds();

		// get center of HTML map
		var ptLatLon = htmlMap_getCenter();

		// do some coordinate smoothing

		// wrap bounds around wrapped center
		while ( arrayPtLatLon[0].lng > ptLatLon.lng ){
			arrayPtLatLon[0].lng -= 360;
			}
		while ( arrayPtLatLon[1].lng < ptLatLon.lng ){
			arrayPtLatLon[1].lng += 360;
		}
		while ( arrayPtLatLon[0].lng < ptLatLon.lng - 360 ){
			arrayPtLatLon[0].lng += 360;
			}
		while ( arrayPtLatLon[1].lng > ptLatLon.lng + 360 ){
			arrayPtLatLon[1].lng -= 360;
		}

		// set SVG map bounds
		var time = setBoundsLatLonSilent(
						arrayPtLatLon[0].lat,
						arrayPtLatLon[0].lng,
						arrayPtLatLon[1].lat,
						arrayPtLatLon[1].lng);

		// if dragging takes to much time, hide the SVG on start dragging
		//
		if ( time > 100 ){
			hideAll();
			fDragSVGHidden = true;
		}
	};


	
/* ------------------------------------------------------------------ * 
	set tool specifc event sharing when tool (zoom,drag,info,...) changes
* ------------------------------------------------------------------ */

	ixmaps.htmlgui_onMapTool = function(szMode){

		fEnableSwitchEvents = true;
		fEnableEventsOnSVG = true;
		fBlockSVGMapEvents = false;
		// GR 16.02.2012 if html map off, pointer events allways on SVG
		if ( !ixmaps.htmlMap ){
			__activateSVGElements(true);
			fEnableSwitchEvents = false;
			return;
		}

		switch(szMode){
			case "zoomrect":
			case "selectrect":
			case "measurement":
			case "polyline":
			case "polygon":
				__activateSVGElements(true);
				fEnableSwitchEvents = false;
				break;
			case "info":
				__activateSVGElements(true);
				fEnableSwitchEvents = true;
				break;
			case "xxxpan":
				fEnableEventsOnSVG = false;
				fBlockSVGMapEvents = true;
				__activateSVGElements(false);
				break;
			case "pan":
				if ( navigator.userAgent.match(/MSIE/) ){
					// we must allow pan with SVG, because IE9 does not support pointer-events yet
					__activateSVGElements(true);
					fEnableSwitchEvents = true;
				}else{
					this.embeddedSVG.window.map.Api.setMapTool("idle");
					__activateSVGElements(false);
				}
				break;

			default:
				__activateSVGElements(false);
				break;
		}
	};

/* ------------------------------------------------------------------ * 
	set map opacity; may be to go to htmlgui.js
* ------------------------------------------------------------------ */

	ixmaps.setSVGMapOpacity = function(nValue,szMode){
		ixmaps.embeddedSVG.window.map.setOpacity(nValue,szMode);
	};
	ixmaps.toggleSVGMapOpacity = function(){
		ixmaps.embeddedSVG.window.map.toggleOpacity();
	};

/* ------------------------------------------------------------------ * 
	h e l p e r
* ------------------------------------------------------------------ */

	var ___SVGHidden = false;

	function hideParentMap(){
		fEnableEventsOnSVG = false;
		hideAll();
	}
	function hideAll(){
		if (___SVGHidden){
			return;
		}
		var div = window.document.getElementById("svgmapdiv");
		if (div){
			try	{		div.style.setProperty("visibility","hidden",null); }
			catch (e) { div.style["visibility"] = "hidden";         	   }
		}
		___SVGHidden = true;
	}
	function showAll(){
		var div = window.document.getElementById("svgmapdiv");
		if (div){
			try	{		div.style.setProperty("visibility","visible",null); }
			catch (e) { div.style["visibility"] = "visible";         	   }
		}
		___SVGHidden = false;
	}
	function hideSVGMap(){
		ixmaps.embeddedSVG.window.map.hideMap();
	}
	function showSVGMap(){
		ixmaps.embeddedSVG.window.map.showMap();
	}
	// depreshiated; remains only for Google V2
	function setCenterLatLon(lat,lon){
		__timer_reset();
		ixmaps.embeddedSVG.window.map.Api.froozeMap(true);
		ixmaps.embeddedSVG.window.map.Api.doCenterMapToGeoPosition(lat,lon);
		ixmaps.embeddedSVG.window.map.Api.froozeMap(false);
		return __timer_getMS();
	}
	function setBoundsLatLon(latSW,lonSW,latNE,lonNE){
		__timer_reset();
		ixmaps.embeddedSVG.window.map.Api.doSetMapToGeoBounds(latSW,lonSW,latNE,lonNE);
	}
	function setBoundsLatLonSilent(latSW,lonSW,latNE,lonNE){
		__timer_reset();
		ixmaps.embeddedSVG.window.map.Api.froozeMap(true);
		ixmaps.embeddedSVG.window.map.Api.doCenterMapToGeoBounds(latSW,lonSW,latNE,lonNE);
		ixmaps.embeddedSVG.window.map.Api.froozeMap(false);
		return __timer_getMS();
	}
	function getCenterLatLon(){
		return ixmaps.embeddedSVG.window.map.Api.getCenterOfMapInGeoPosition();
	}
	function getBoundsLatLon(){
		try	{
			var arrayPtLatLon = ixmaps.embeddedSVG.window.map.Api.getBoundsOfMapInGeoBounds();
			arrayPtLatLon[0].x = Math.max(Math.min(arrayPtLatLon[0].x,180),-180);
			arrayPtLatLon[0].y = Math.max(Math.min(arrayPtLatLon[0].y,80),-80);
			arrayPtLatLon[1].x = Math.max(Math.min(arrayPtLatLon[1].x,180),-180);
			arrayPtLatLon[1].y = Math.max(Math.min(arrayPtLatLon[1].y,80),-80);

			return new Array({lat:arrayPtLatLon[0].y,
							  lng:arrayPtLatLon[0].x},
							 {lat:arrayPtLatLon[1].y,
							  lng:arrayPtLatLon[1].x});
		} catch(e) {return null;}
	}

/* ------------------------------------------------------------------ * 
	t i m e r 
* ------------------------------------------------------------------ */

/**
 * sets the timer to zero
 */
var __timer_nMillisec = 0;
function __timer_reset(){
	var jetzt = new Date();
	__timer_nMillisec = jetzt.getTime();
}
/**
 * gets the elapsed time (in ms)
 */
function __timer_getMS(){
	var jetzt = new Date();
	var nActMilli = jetzt.getTime();
	return (nActMilli - __timer_nMillisec);
}
/**
 * gets the elapsed time (in ms)
 */
function __timer_getSEC(){
	var jetzt = new Date();
	var nActMilli = jetzt.getTime();
	return (nActMilli - __timer_nMillisec)/1000;
}

	/** set HTML map bounds
	 */
	ixmaps.htmlgui_setCenterAndZoom = function(ptCenter,nZoom){
//		htmlMap_setBounds(new Array(ptSW,ptNE));
		htmlMap_setCenter(ptCenter);
		htmlMap_setZoom(nZoom);
	};


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!
// called by SVG map script !!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!

	/** notify htmlgui on SVG idle -> release events handling
	 */
	ixmaps.htmlgui_onSVGPointerIdle = function(){
		__activateSVGElements(false);
	};

	/** set HTML map bounds
	 */
	ixmaps.htmlgui_setCurrentEnvelopeByGeoBounds = function(ptSW,ptNE){
		if ( ixmaps.htmlMap ){
			htmlMap_setBounds(new Array({lat:ptSW.y,
										 lng:ptSW.x},
										{lat:ptNE.y,
										 lng:ptNE.x})
				);
			fDragSVGHidden = true;
			// ixmaps.HTML_showLoading();
			hideAll();
			htmlgui_synchronizeSVG(false);
			return true;
		}else{
			return false;
		}
	};
	ixmaps.htmlgui_setCurrentCenterByGeoBounds = function(ptCenter){
		if ( ixmaps.htmlMap ){
			htmlMap_setCenter({	lat:ptCenter.y,
								lng:ptCenter.x}
				);
			// GR 08.05.2012 absolete; tbv
			// htmlgui_synchronizeSVG(true);
			return true;
		}else{
			return false;
		}
	};

}( window.ixmaps = window.ixmaps || {}, jQuery ));

// .............................................................................
// EOF
// .............................................................................

