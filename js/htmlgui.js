/**********************************************************************
 htmlgui.js

$Comment: provides JavaScript HTML application interface to svggis
$Source : htmlgui.js,v $

$InitialAuthor: guenter richter $
$InitialDate: $
$Author: guenter richter $
$Id: htmlgui.js 8 2007-06-05 08:14:02Z Guenter Richter $

Copyright (c) Guenter Richter
$Log: htmlgui.js,v $
**********************************************************************/

/** 
 * @fileoverview This file provides GUI functions for a HTML page that embeds a SVGGIS map<br>
 * @author Guenter Richter guenter.richter@medienobjekte.de
 * @version 1.1 
 */

/**
 * define namespace ixmaps
 */

(function( ixmaps, $, undefined ) {

	/* ------------------------------------------------------------------ * 
		global variables
	 * ------------------------------------------------------------------ */

	ixmaps.szUrlSVG	= null;
	ixmaps.helpWindow = null;
	ixmaps.toolsWindow = null;
	ixmaps.sidebar = null;
	ixmaps.htmlMap = null;

	/* ------------------------------------------------------------------ * 
		local variables
	 * ------------------------------------------------------------------ */

	var __SVGResources_includePath  = "../resources";
	var	__SVGFile					= "";
	var	__SVGEmbedWidth				= 0;
	var	__SVGEmbedHeight			= 0;
	var __SVGmapPosX				= 0;			
	var __SVGmapPosY				= 0;			
	var __SVGmapOffX				= 0;			
	var __SVGmapOffY				= 0;
	var __SVGmapWidth				= 0;			
	var __SVGmapHeight				= 0;

	var __mapTop					= 0;
	var __mapLeft					= 0;

	ixmaps.fMapLegendStyle			= "visible";
	ixmaps.fMapControlStyle			= "large";
	ixmaps.fMapSizeMode				= "fullscreen";

	/* ------------------------------------------------------------------ * 
		jquery extensions
	 * ------------------------------------------------------------------ */

	(function( $ ){ 

		/**
		* assert a string.
		* @example $(str).assertStr();
		*/ 
		$.fn.assertStr = function(szError){
		  if ( this.selector && (typeof(this.selector)!="undefined") && this.selector.length ) {
			  return true;
		  }
		  if ( szError ){
			  alert(szError);
		  }
		  return false;
		};

	})( jQuery );

	//	for IE9			- document.implementation.hasFeature("org.w3c.svg", "1.0") 
	//	for the rest	- document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1")
	ixmaps.hasSVG = function(){
		return( document.implementation.hasFeature("org.w3c.svg", "1.0") ||
				document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1") );
	};

	/* ------------------------------------------------------------------ * 
		Init functions
	 * ------------------------------------------------------------------ */

	ixmaps.syncMap = function(szMapDiv,options){

		if ( !ixmaps.hasSVG() ){
			alert("sorry ! your browser has no native SVG support;\n\nPlease try:   Chrome, Firefox, Safari, Opera or IE9" );
			return;
		}

		var mapDiv = $('#'+szMapDiv)[0];

		/** 
		*  try to get the offset of the map div 
		*  is needed for the fullscreen mode
		**/
		__mapTop  = parseInt($('#'+szMapDiv).css("top"));
		__mapLeft = parseInt($('#'+szMapDiv).css("left"));

		if ( isNaN(__mapTop) && mapDiv.parentNode ){
			__mapTop  = parseInt($('#'+szMapDiv).parent().css("top"));
		}
		if ( isNaN(__mapLeft && mapDiv.parentNode) ){
			__mapLeft = parseInt($('#'+szMapDiv).parent().css("left"));
		}
		/**
			for old map pages or if missing parent DIV
		**/
		if ( isNaN(__mapTop) ){
			__SVGmapPosY = 38;
			__mapTop = 0;
		}
		if ( isNaN(__mapLeft) ){
			__mapLeft = 0;
		}

		/** 
		*  create the divs for svg and html map 
		**/
		var aDiv = null;
		aDiv = document.createElement("div");
		aDiv.setAttribute("id","gmap");
		mapDiv.appendChild(aDiv);
		aDiv = document.createElement("div");
		aDiv.setAttribute("id","svgmapdiv");
		mapDiv.appendChild(aDiv);

		if (options.mapsize == "fix"){
			ixmaps.fMapSizeMode	= "fix";
			__SVGEmbedWidth = mapDiv.clientWidth;
			__SVGEmbedHeight = mapDiv.clientHeight;
			__mapTop  = 0;
			__mapLeft = 0;
		}
		if (options.mode){
			if (options.mode.match(/nolegend/)){
				ixmaps.fMapLegendStyle = "hidden";
			}
		}
		if (options.controls){
			if (options.controls.match(/small/)){
				ixmaps.fMapControlStyle = "small";
			}
			if (options.controls.match(/mobile/)){
				ixmaps.fMapControlStyle = "mobile";
			}
		}
		if (options.maptype){
			ixmaps.fMapType = options.maptype;
		}

		/** 
		*  load the maps
		**/

		return ixmaps.InitAll("gmap","svgmapdiv",options.svg,options.mapService);
	};

	ixmaps.InitAll = function(szGmapDiv,szSvgDiv,szUrl,szMapService){

		var szError = null;
		if (!$(szGmapDiv).assertStr()){
			szError = "Error: missing map target (HTML div)!";
		}
		if (!$(szSvgDiv).assertStr()){
			szError = "Error: missing map target (SVG div)!";
		}
		if (!$(szUrl).assertStr()){
			szError = "Error: no SVG map defined!";
		}
		if ( szError ){
			this.HTML_showLoading();
			$("#loading-text").append(szError);
			$("#loading-image").css("visibility","hidden");
			return;
		}

		this.szUrlSVG = szUrl;
		this.szGmapDiv  = szGmapDiv;
		this.szSvgDiv   = szSvgDiv;
		this.gmapDiv	= $('#'+szGmapDiv)[0];
		this.svgDiv		= $('#'+szSvgDiv)[0];

		if ( szMapService == null || szMapService == 'null'){
			szMapService = "";
		}
		this.szMapService = szMapService;
		
		var fullWidth	= __SVGEmbedWidth?__SVGEmbedWidth:window.innerWidth;
		var fullHeight	= __SVGEmbedHeight?__SVGEmbedHeight:window.innerHeight;

		var mapWidth  = fullWidth  - __mapLeft - __SVGmapPosX;			
		var mapHeight = fullHeight - __mapTop  - __SVGmapPosY;			

		this.HTML_hideLoading();

		// -----------------------------------
		// prepare hosting div for google maps
		// -----------------------------------

		if (this.gmapDiv){
			this.gmapDiv.setAttribute("onmousedown","javascript:ixmaps.do_mapmousedown();");
			this.gmapDiv.setAttribute("onmouseup","javascript:ixmaps.do_mapmouseup();");
			this.gmapDiv.setAttribute("onmouseout","javascript:ixmaps.do_mapmouseout();");
			this.gmapDiv.setAttribute("onmouseover","javascript:ixmaps.do_mapmouseover();");
			this.gmapDiv.setAttribute("onmousemove","javascript:ixmaps.do_mapmousemove();");
			this.gmapDiv.setAttribute("onKeyDown","javascript:ixmaps.do_keydown(evt);");
			this.gmapDiv.setAttribute("onKeyUp","javascript:ixmaps.do_keyup(evt);");
			
//			$(this.gmapDiv).css('background-color','#eeeeee');
			$(this.gmapDiv).css({'pointer-events':'all'	,
								 'position':'absolute'	,
								 'top':__SVGmapPosY+'px',
								 'left':__SVGmapPosX+'px',
								 'height':mapHeight+'px',
								 'width':mapWidth+'px'	});

			this.htmlMap = true;
		}

		// ------------------------------------
		// prepare hosting div for ixmap svgmap
		// ------------------------------------

		if (this.svgDiv){
			this.svgDiv.setAttribute("onmousedown","javascript:ixmaps.do_svgtriggerevent();");
			this.svgDiv.setAttribute("onmouseup","javascript:ixmaps.do_svgtriggerevent();");
			this.svgDiv.setAttribute("onmouseout","javascript:ixmaps.do_svgtriggerevent();");
			this.svgDiv.setAttribute("onmousemove","javascript:ixmaps.do_svgtriggerevent();");

			this.svgDiv.setAttribute("style","pointer-events:none;position:absolute;z-index:1;visibility:hidden;"+
				"top:"+__SVGmapPosY+"px;"+
				"left:"+__SVGmapPosX+"px;"+
				"width:100%;"+
				"height:100%;");

			this.svgDiv.innerHTML = 
				"<object id='SVGMap' type='image/svg+xml' wmode='transparent' name='svgmap' "+
				"data='"+this.szUrlSVG+"' "+
				"width='"+(mapWidth)+"px' "+
				"height='"+(mapHeight)+"px' "+
				">";

			this.svgObject = $('#'+this.szSvgDiv+' > object')[0];
			
			this.HTML_loadSVGMap(this.szUrlSVG);
		}

		__addEvent(window, "resize", function() { ixmaps.onWindowResize(null,false); } );

		setTimeout("ixmaps.onWindowResize(null,false)",100);
		
		return ixmaps;
	};

	ixmaps.onWindowResize = function(mapBox,fZoomTo){

		if (mapBox){
			__SVGmapOffX = mapBox.x;			
			__SVGmapOffY = mapBox.y;	
			__SVGmapWidth  = mapBox.width;			
			__SVGmapHeight = mapBox.height;			
		}else{
			if ( ixmaps.fMapSizeMode == "fix" ){
				return;
			}
			if ( $("#banner-right").position() ){
				__SVGmapPosY = $("#banner-right").position().top - parseInt($("#banner-right").parent().css("padding-top"));
				$("#banner").css("height","40px");
			}
			__SVGmapWidth  = window.innerWidth  - __mapLeft - __SVGmapPosX - __SVGmapOffX;			
			__SVGmapHeight = window.innerHeight - __mapTop  - __SVGmapPosY - __SVGmapOffY;			
		}
		if ($(this.gmapDiv)){
			$(this.gmapDiv).css({
				"top"	:(__SVGmapPosY+__SVGmapOffY)+"px",
				"left"	:(__SVGmapPosX+__SVGmapOffX)+"px",
				"width"	:(__SVGmapWidth)+"px",
				"height":(__SVGmapHeight)+"px"
				});
		}
		if ($(this.svgDiv)){
			$(this.svgDiv).css({
				"top"	:(__SVGmapPosY)+"px",
				"left"	:(__SVGmapPosX)+"px",
				"width"	:(__SVGmapOffX+__SVGmapWidth)+"px",
				"height":(__SVGmapOffY+__SVGmapHeight)+"px",
				"overflow":"hidden"
				});
		}
		if ($("#SVGMap")){
			$("#SVGMap").css({
				"width"	:(__SVGmapOffX+__SVGmapWidth)+"px",
				"height":(__SVGmapOffY+__SVGmapHeight)+"px"
				});
		}
		if ($("#dummy-split-container")){
			$("#dummy-split-container").css({
				"top"	:(__SVGmapPosY+__SVGmapOffY)+"px",
				"left"	:(__SVGmapPosX+__SVGmapOffX)+"px",
				"width"	:(__SVGmapWidth)+"px",
				"height":(__SVGmapHeight)+"px"
				});
		}

		htmlMap_setSize(__SVGmapWidth,__SVGmapHeight);

		this.htmlgui_resizeMap(fZoomTo,__SVGmapOffX+__SVGmapWidth,__SVGmapOffY+__SVGmapHeight);
	};

	ixmaps.HTML_loadSVGMap = function(szUrl,szName){

		this.HTML_hideMap();
		this.HTML_showLoading();
		if (ixmaps.embeddedSVG){
			this.mapTool("");
		}
		this.buttonList.reset("all");
		remove_popupTools();
		remove_popupHelp();

		$(this.svgDiv).css("visibility","hidden");

		this.szUrlSVG = szUrl;
		this.szUrlSVGRoot = "";
		if (szUrl.match(/\//)){
			urlA = szUrl.split("/");
			for ( var i=0; i<urlA.length-1; i++){
				this.szUrlSVGRoot += urlA[i]+"/";
			}
		}else{
			this.szUrlSVGRoot = "";
		}

		$(this.svgObject).attr('data',this.szUrlSVG);

		this.embeddedSVG = null;
		do_enableSVG();

		$("#loading-text").empty();
		$("#loading-text").append(szName?szName:"loading map ...");

	};

	ixmaps.HTML_setSVGMapByList = function(){

		var svgmapList = window.document.getElementById("svgMapList");
		this.HTML_loadSVGMap(svgmapList.value);
	};

	ixmaps.HTML_setSVGMap = function(szUrl,szName){

		this.HTML_loadSVGMap(szUrl,szName);
		$("#dialog").dialog( "close" );
	};

	ixmaps.HTML_showLoading = function(){
		try{
			var top  = (window.innerHeight*0.4);
			var left = (window.innerWidth*0.47);
			var gmapDiv = this.gmapDiv;
			if (gmapDiv && $(gmapDiv).css("visibility") == "visible" ){
				top  = parseInt($(gmapDiv).css("top")) + parseInt($(gmapDiv).css("height"))/2;
				left = parseInt($(gmapDiv).css("left"))+ parseInt($(gmapDiv).css("width"))/2;
			}
			$("#divloading").css({
				"visibility":"visible",
				"top"		:String(top+"px"),
				"left"		:String(left+"px")
				});
		}
		catch (e){
		}
	};
	ixmaps.HTML_hideLoading = function(){
		try{
			$("#divloading").css("visibility","hidden");
		}
		catch (e){
		}
	};

	// show/hide HTML map
	// ------------------
	// if map is intentionally toggled off, don't show
	var __fMapToggle = true;

	ixmaps.HTML_showMap = function(){
		if ( this.gmapDiv && !this.gmap ){
			this.gmap = this.loadGMap(this.szMapService);
			this.htmlMap = true;
		}
		$(this.gmapDiv).css("visibility","visible");
		this.hideNorthArrow();
	};

	ixmaps.HTML_hideMap = function(){
		$(this.gmapDiv).css("visibility","hidden");
		this.showNorthArrow();
	};
	
	ixmaps.HTML_toggleMap = function(){
		if ( $(this.gmapDiv).css("visibility") == "visible" ){
			this.HTML_hideMap();
			this.htmlMap = false;
		}else{
			this.HTML_showMap();
			this.htmlMap = true;
			this.htmlgui_synchronizeMap(false,true);
		}
	};

	// show/hide SVG map
	// ------------------
	ixmaps.HTML_toggleSVG = function(){
		if ( $(this.svgDiv).css("width") == (__SVGmapOffX+"px") ){
			$(this.svgDiv).css("width",(__SVGmapOffX+__SVGmapWidth)+"px");
		}else{
			$(this.svgDiv).css("width",(__SVGmapOffX)+"px");
		}
	};

	/** query HTML map visibility
	 */
	ixmaps.htmlgui_isHTMLMapVisible = function(){
		return ($(this.gmapDiv).css("visibility") == "visible");
	};

	/* ------------------------------------------------------------------ * 
		helper
	 * ------------------------------------------------------------------ */

	var __addEvent = function(elem, type, eventHandle) {
		if (elem == null || elem == undefined){
			return;
		}
		if ( elem.addEventListener ) {
			elem.addEventListener( type, eventHandle, false );
		} else if ( elem.attachEvent ) {
			elem.attachEvent( "on" + type, eventHandle );
		}
	};
	ixmaps.openDialog = function(event,szElement,szUrl,szTitle,szPosition,nMaxWidth,nMaxHeight,nOpacity){

		var offsetLeft = null;
		var offsetTop  = null;
		if ( event && (typeof(event) != "undefined") ){
			if ( $(event.currentTarget) ){
				offsetLeft = $(event.currentTarget).offset().left + $(event.currentTarget).innerWidth();
				offsetTop  = $(event.currentTarget).offset().top  + $(event.currentTarget).innerHeight();
			}
		}

		var dialogWidth  = nMaxWidth?nMaxWidth:450;
		var dialogHeight = Math.min(__SVGmapHeight-30,nMaxHeight?nMaxHeight:__SVGmapHeight-30);

		var nPosition = [450,50];

		if ( !szPosition ){
			szPosition = "center";
		}

		if ( szPosition ){
			if ( szPosition == "left" ){
				nPosition = [0,50];
			}
			else
			if ( szPosition == "centerleft" ){
				nPosition = [50,50];
			}
			else
			if ( szPosition == "right" ){
				nPosition = [window.innerWidth-dialogWidth-50,50];
			}
			else
			if ( szPosition == "center" ){
				nPosition = [window.innerWidth/2-dialogWidth/2,50];
			}
			else
			if ( szPosition == "auto" && offsetLeft && offsetTop ){
				nPosition = [Math.max(10,offsetLeft-dialogWidth-5),offsetTop+10];
			}
			else
			if ( szPosition.match(/,/) ){
				var szValueA = szPosition.split(",");
				nPosition = [Number(szValueA[0]),Number(szValueA[1])];
			}
			else{
				nPosition = [window.innerWidth/2-dialogWidth/2,50];
			}
		}
		// if no spez. host element given, create randomone
		if ( typeof($("#"+szElement)[0]) == "undefined" ){
			szElement = "dialog-"+String(Math.random()).substr(2,10);
			var dialogDiv = document.createElement("div");
			dialogDiv.setAttribute("id",szElement);
			$("#dialog")[0].parentNode.appendChild(dialogDiv);
		}

		$("#"+szElement).css("visibility","visible");
	    $("#"+szElement).dialog({ width: dialogWidth, height: dialogHeight, title: szTitle, position:  nPosition, close: function(event, ui) {
			if ( typeof(szUrl) == "string" && szUrl.length ){
				$("#"+szElement)[0].innerHTML = "";
				}
			}
			});
		// GR 13.10.2011 set opacity
		if (nOpacity){
			$("#"+szElement).parent().css("opacity",String(nOpacity));
		}
		// load content
		if ( typeof(szUrl) == "string" && szUrl.length ){
			$("#"+szElement)[0].innerHTML = 
				"<iframe id=\"dialogframe\" src=\""+szUrl+"\" width=\"100%\" height=\"100%\" frameborder=\"0\" marginwidth=\"0px\" />";
			}
		return 	"dialogframe";
	};
	ixmaps.openSidebar = function(event,szElement,szUrl,szTitle,szPosition,nMinWidth,nMinHeight){
		if ( typeof($("#"+szElement)[0]) == "undefined" ){
			szElement = "dialog";
		}
		if ( ixmaps.sidebar ){
			$(ixmaps.sidebar).css("visibility","hidden");
			ixmaps.sidebar.innerHTML = "";
			ixmaps.sidebar = null;
			return;
		}
		$("#"+szElement).css({
			"visibility":"visible",	
			"position"	:"absolute",
			"top"		:"30px;",
			"left"		:"10px;",
			"z-index"	:"1000",
			"width"		:"370px",
			"height"	:(__SVGmapHeight-30) +"px",
			"background-color":"#fff",
			"border-right":"solid 1px #ddd",
			"border-bottom":"solid 1px #ddd"
		});
		if ( typeof(szUrl) == "string" && szUrl.length ){
			$("#"+szElement)[0].innerHTML = 
				"<div id=\"sidebarclosebutton\" style=\position:absolute;top:1px;left:370px;background-color:#fff;border-right:solid;border-bottom:solid;border-color:#ddd;border-width:1;\">" + 
				"<a style=\"font-family:verdana;font-size:16px;color:#888\" href=\"javascript:ixmaps.closeSidebar();\">&nbsp;x&nbsp;</a></div>" +
				//"<button type=\"button\" id=\"closetools\" style=\"position:absolute;top:6px;left:368px;background-color:#fff;height:23px;\"><label for=\"popuptools\"></label></button>" +
				"<iframe src=\""+szUrl+"\" width=\"100%\" height=\"100%\" frameborder=\"0\" marginwidth=\"0px\" />";

		}
		$( "#closetools" ).button({ icons:{primary:'ui-icon-close'}}).click(function(e){
							ixmaps.openSidebar(e,'dialog','','','auto',350,800);
							});
		ixmaps.sidebar = $("#"+szElement)[0];
	};
	ixmaps.closeSidebar = function(){
		if ( ixmaps.sidebar ){
			$(ixmaps.sidebar).css("visibility","hidden");
			ixmaps.sidebar.innerHTML = "";
			ixmaps.sidebar = null;
			return;
		}
	};
	ixmaps.openMegaBox = function(event,szElement,szUrl,szTitle){
		if ( typeof($("#"+szElement)[0]) == "undefined" ){
			return;
		}

		var dialogWidth   = Math.min(800,window.innerWidth*0.75);
		var dialogHeight  = Math.min(800,window.innerHeight*0.85);
		var nPosition = [window.innerWidth/2-dialogWidth/2,50];

		$("#velo").css({
			"visibility":"visible",
			"width":(__SVGmapOffX+__SVGmapWidth)+"px",
			"height":(__SVGmapHeight)-"px"
		});
		$("#"+szElement).css("visibility","visible");
	    $("#"+szElement).dialog({ width: dialogWidth, height: dialogHeight, title: szTitle, position:  nPosition, close: function(event, ui) {
			$("#velo").css("visibility","hidden");
			}
			});
		if ( typeof(szUrl) == "string" && szUrl.length ){
			$("#"+szElement)[0].innerHTML = 
				"<iframe src=\""+szUrl+"\" width=\"100%\" height=\"100%\" frameborder=\"0\" marginwidth=\"0px\" />";
			}	
	};

	/* ------------------------------------------------------------------ * 
		slitter - 
	 * ------------------------------------------------------------------ */

	var ___splitterMode = "div";
	var ___splitter = false;
	var ___splitterVisible = false;
	var ___splitterWidth = 0;
	ixmaps.toggleSplitter = function(){
		if ( !___splitter ){
			initSplitter();
			___splitter = true;
		}else{
			if ( ___splitterVisible ){
				$('#dummy-split-container').css("visibility","hidden");
				if ( ___splitterMode == "div" && this.svgDiv){
					$(this.svgDiv).css("width",(__SVGmapOffX+__SVGmapWidth)+"px");
				}else{
					ixmaps.clipLayer(null,(__SVGmapWidth));
				}
			}else{
				$('#dummy-split-container').css("visibility","visible");
				if ( ___splitterMode == "div" && this.svgDiv){
					$(this.svgDiv).css("width",(__SVGmapPosX+__SVGmapOffX+___splitterWidth)+"px");
				}else{
					ixmaps.clipLayer(null,(___splitterWidth));
				}
			}
		}
		___splitterVisible = ___splitterVisible?false:true;
	};
	ixmaps.removeSplitter = function(){
		if ( !___splitter ){
			return;
		}else{
			if ( ___splitterVisible ){
				$('#dummy-split-container').css("visibility","hidden");
				if ( ___splitterMode == "div" && this.svgDiv ){
					$(this.svgDiv).css("width",(__SVGmapOffX+__SVGmapWidth)+"px");
				}else{
					ixmaps.clipLayer(null,(__SVGmapWidth));
				}
			}
		}
		___splitterVisible = false;
	};
	function initSplitter(){
		var splitterDiv = document.createElement("div");
		splitterDiv.setAttribute("id","dummy-split-container");
		splitterDiv.setAttribute("style","position:absolute");
		splitterDiv.innerHTML  = "<div><img alt=\"before\" src=\"\" style=\"visibility:hidden\" width=\""+(__SVGmapWidth)+"px"+"\" height=\""+(__SVGmapHeight)+"px"+"\" /></div>";
		splitterDiv.innerHTML += "<div><img alt=\"after\" src=\"\" style=\"visibility:hidden\" /></div>";

		ixmaps.svgDiv.parentNode.insertBefore(splitterDiv,ixmaps.svgDiv.nextSibling);

		var splitterDiv = window.document.getElementById("dummy-split-container");
		if ($("#dummy-split-container")){
			$("#dummy-split-container").css({
				"top"	:(__SVGmapPosY+__SVGmapOffY)+"px",
				"left"	:(__SVGmapPosX+__SVGmapOffX)+"px",
				"width"	:(__SVGmapWidth)+"px",
				"height":(__SVGmapHeight)+"px"
			});
		}

		$('#dummy-split-container').beforeAfter({showFullLinks:false,
												 onReady:setSplitter,
												 onMove:setSplitter,
												 imagePath : '../../ui/libs/beforeafter/js/'});
	}
	function setSplitter(nWidth){
		___splitterWidth = nWidth;
		if ( ___splitterMode == "div" && ixmaps.svgDiv){
			$(ixmaps.svgDiv).css("width",(__SVGmapPosX+__SVGmapOffX+___splitterWidth)+"px");
		}else{
			ixmaps.clipLayer(null,(___splitterWidth));
		}
		/**
			var gmapDiv = window.document.getElementById("gmap");
			if (0 && gmapDiv){
				gmapDiv.style["width"] = (nWidth)+"px";
			}
		**/
	}

	// -----------------------------
	// html button handler
	// -----------------------------

	ixmaps.panMap = function(nDeltaX,nDeltaY,szMode){
		try{
			ixmaps.embeddedSVG.window.map.Api.doPanMap(nDeltaX,nDeltaY,szMode);
		}
		catch (e){
			alert('map api error!');
		}
	};
	ixmaps.zoomMap = function(nIndex,szMode,newZoom){
		try{
			var zoomSelect  = window.document.getElementById("zoomList");
			var newScale = ixmaps.embeddedSVG.window.map.Api.doZoomMap(nIndex,szMode,newZoom);
			if ( szMode == null ){
				zoomSelect.options[zoomSelect.options.length-1].text = "1:"+newScale;
				zoomSelect.selectedIndex = zoomSelect.options.length-1;
			}
		}
		catch (e){
			alert('map api error!');
		}
	};
	ixmaps.clipLayer = function(szLayerName,nWidth){
		try{
			ixmaps.embeddedSVG.window.map.Api.setLayerClip(szLayerName,nWidth);
		}
		catch (e){
			alert('map api error!');
		}
	};
	ixmaps.clipMap = function(nWidth){
		try{
			ixmaps.embeddedSVG.window.map.Api.setMapClip(nWidth);
		}
		catch (e){
			alert('map api error!');
		}
	};
	ixmaps.backwardsMap = function(){
		try{
			ixmaps.embeddedSVG.window.map.Api.backwards();
		}
		catch (e){
			alert('map api error!');
		}
	};
	ixmaps.forwardsMap = function(){
		try{
			ixmaps.embeddedSVG.window.map.Api.forwards();
		}
		catch (e){
			alert('map api error!');
		}
	};
	ixmaps.mapTool = function(szMode){
		try{
			ixmaps.embeddedSVG.window.map.Api.setMapTool(szMode);
		}
		catch (e){
			alert('map api error!');
		}
	};
	ixmaps.newTheme = function(theme){
		try{
			ixmaps.embeddedSVG.window.map.Api.newMapTheme(theme.layer,theme.fields,theme.field100,theme.style,theme.title,theme.label);
		}catch (e){}
	};
	ixmaps.clearAll = function(){
		try{
			ixmaps.embeddedSVG.window.map.Api.clearAll();
		}catch (e){}
	};
	ixmaps.clearAllCharts = function(){
		try{
			ixmaps.embeddedSVG.window.map.Api.clearAllCharts();
		}catch (e){}
	};
	ixmaps.clearAllChoroplethe = function(){
		try{
			ixmaps.embeddedSVG.window.map.Api.clearAllChoroplethe();
		}catch (e){}
	};
	ixmaps.changeObjectScaling = function(nDelta){
		try{
			ixmaps.embeddedSVG.window.map.Api.changeObjectScaling(nDelta);
		}catch (e){}
	};
	ixmaps.changeLabelScaling = function(nDelta){
		try{
			ixmaps.embeddedSVG.window.map.Api.changeLabelScaling(nDelta);
		}catch (e){}
	};
	ixmaps.changeLineScaling = function(nDelta){
		try{
			ixmaps.embeddedSVG.window.map.Api.changeLineScaling(nDelta);
		}catch (e){}
	};
	ixmaps.changeRotation = function(nDelta){
		try{
			ixmaps.embeddedSVG.window.map.Api.changeRotation(nDelta);
		}catch (e){}
	};
	ixmaps.showNorthArrow = function(){
		try{
			ixmaps.embeddedSVG.window.map.Api.showNorthArrow();
		}catch (e){}
	};
	ixmaps.hideNorthArrow = function(){
		try{
			ixmaps.embeddedSVG.window.map.Api.hideNorthArrow();
		}catch (e){}
	};

	_valuesFlag = false;
	ixmaps.toggleThemeValues = function(fFlag){
		try{
			_valuesFlag = !_valuesFlag;
			ixmaps.embeddedSVG.window.map.Api.toggleThemeValues(_valuesFlag);
		}catch (e){}
	};
	_legendsFlag = true;
	ixmaps.toggleThemeLegends = function(fFlag){
		try{
			_legendsFlag = !_legendsFlag;
			ixmaps.embeddedSVG.window.map.Api.toggleThemeLegends(_legendsFlag);
		}catch (e){}
	};
	ixmaps.extendMap = function(){
		try{
			ixmaps.embeddedSVG.window.map.Api.extendMap();
		}catch (e){}
	};
	ixmaps.normalMap = function(){
		try{
			ixmaps.embeddedSVG.window.map.Api.normalMap();
		}catch (e){}
	};
	var __fLegendSideBar = true;
	ixmaps.toggleLegend = function(){
		if ( __fLegendSideBar ){
			ixmaps.extendMap();
		}else{
			ixmaps.normalMap();
		}
		__fLegendSideBar =! __fLegendSideBar;
	};
	ixmaps.zoomMapByList = function(){
	var zoomList = window.document.getElementById("zoomList");
		this.zoomMap(zoomList.value,'byscale');
	};
	ixmaps.resetMap = function(){
		try{
			ixmaps.embeddedSVG.window.map.Api.clearAll();
			ixmaps.embeddedSVG.window.map.Api.doZoomMapToFullExtend();
			this.htmlgui_synchronizeMap(false,true);
			ixmaps.resetCenter();
			}catch (e){}	
	};
	ixmaps.resetCenter = function(){
			var arrayPtLatLon = htmlMap_getBounds();
			ixmaps.embeddedSVG.window.map.Api.doSetMapToGeoBounds(
				arrayPtLatLon[0].lat,
				arrayPtLatLon[0].lng,
				arrayPtLatLon[1].lat,
				arrayPtLatLon[1].lng);
	};


	// touch to mouse !!!

	ixmaps.simulateMouseDown = function(pos){
		var evt = ixmaps.embeddedSVG.window.document.createEvent("MouseEvents");
		var cb = ixmaps.embeddedSVG.window.document.getElementById("mapbackground:eventrect");

		evt.initMouseEvent("mousedown", true, false, this, 1, pos.x, pos.y, pos.x, pos.y, false,
                         false, false, false, 0, cb);
		cb.dispatchEvent(evt);
		evt.target = cb;
		ixmaps.embeddedSVG.window.map.Event.defaultMouseDown(evt);
	};
	ixmaps.simulateMouseMove = function(pos){
		var evt = ixmaps.embeddedSVG.window.document.createEvent("MouseEvents");
		var cb = ixmaps.embeddedSVG.window.document.getElementById("mapbackground:eventrect");

		evt.initMouseEvent("mousemove", true, false, this, 1, pos.x, pos.y, pos.x, pos.y, false,
                         false, false, false, 0, cb);
		cb.dispatchEvent(evt);
		evt.target = cb;
		ixmaps.embeddedSVG.window.map.Event.defaultMouseMove(evt);
	};
	ixmaps.simulateMouseUp = function(){
		var evt = ixmaps.embeddedSVG.window.document.createEvent("MouseEvents");

		evt.initMouseEvent("mouseup", true, false, this, 1, 0, 0, 0, 0, false,
                         false, false, false, 0, null);
		var cb = ixmaps.embeddedSVG.window.document.getElementById("mapbackground:eventrect");
		cb.dispatchEvent(evt);
		evt.target = cb;
		ixmaps.embeddedSVG.window.map.Event.defaultMouseUp(evt);
	};

	// ----------------------------------------------------------------------
	// Interface between SVG and HTML for zoom, pan and scale synchronizing
	// ----------------------------------------------------------------------

	/**
	 * called if SVG map is loaded and in phase di initialising
	 * permits to intervent in the initialising process
	 * @param mapwindow the window handle of the SVG map 
	 * @return ---
	 */
	ixmaps.htmlgui_onMapInit = function(mapwindow){

		this.embeddedSVG = new Object({window:mapwindow});

		if ( this.fMapLegendStyle.match(/hidden/) ){
			this.extendMap();
		}
	};

	/**
	 * called if SVG map is loaded and formatted
	 * @param mapwindow the window handle of the SVG map 
	 * @return ---
	 */
	ixmaps.htmlgui_onMapReady = function(mapwindow){

		if ( this.htmlMap && this.gmapDiv && !this.gmap ){
			this.gmap = this.loadGMap(this.szMapService);
		}else{
			var div = window.document.getElementById("svgmapdiv");
			if (div){
				try	{		div.style.setProperty("visibility","visible",null); }
				catch (e) { div.style["visibility"] = "visible";         	   }
			}
		}

		// enable access to the SVG map
		// ----------------------------
		this.embeddedSVG = new Object({window:mapwindow});
		try{
			this.embeddedSVG.window._TRACE("==> htmlgui: onMapReady() ! ==>   ==>   ==>   ==>   ==>   ==>   ==>   ==>");
		}
		catch (e){
		}
		if (this.parentApi && this.parentApi.setEmbeddedSVG ){
			this.parentApi.setEmbeddedSVG(this.embeddedSVG);
		}

		// hide loding image 
		// --------------------------
		try{
			$("#divloading").css("visibility","hidden");
			$("#ixmap").css("background","#fff");
		}
		catch (e){
		}

		// adapt the HTML map to the canvas offsets of the SVG map
		// --------------------------------------------------------
		try{
			var mapBox = this.embeddedSVG.window.map.Api.getMapBox();
			this.onWindowResize(mapBox,true);
			this.embeddedSVG.window._TRACE("==> htmlgui: mapBox ( "+mapBox.x+" , "+mapBox.y+" , "+mapBox.width+" , "+mapBox.height+" )");
		}
		catch (e){
		}
	};

	/**
	 * called if SVG map has been resized (e.g. legend switched off)
	 * @return ---
	 */
	ixmaps.htmlgui_onMapResize = function(){

		// adapt the HTML map to the canvas offsets of the SVG map
		// --------------------------------------------------------
		try{
			var mapBox = this.embeddedSVG.window.map.Api.getMapBox();
			this.onWindowResize(mapBox,false);
		}
		catch (e){
		}
	};
	/**
	 * set actual scale in HTML scale select form 
	 * @param newScale the scale to set (integer value)
	 * @return ---
	 */
	ixmaps.htmlgui_setScaleSelect = function(newScale){
		if ( this.embeddedSVG ){
			try{
				var zoomSelect  = window.document.getElementById("zoomList");
				zoomSelect.options[zoomSelect.options.length-1].text = "1:"+newScale;
				zoomSelect.selectedIndex = zoomSelect.options.length-1;
			}
			catch (e){
			}
		}
	};
	/**
	 * set actual map envelope
	 * save in cookie and synchronize evt. HTML map
	 * @param szEnvelope the scale to set (integer value)
	 * @return ---
	 */
	ixmaps.htmlgui_setCurrentEnvelope = function(szEnvelope,fZoomto){
		if ( this.embeddedSVG ){
//			htmlgui_setCookie('mapenvelope', szEnvelope);
			try{
				this.htmlgui_synchronizeMap(false,fZoomto);
			}
			catch (e){
			}
		}
	};

	/**
	 * Is called by the map to open a browser popup window
	 */
	ixmaps.htmlgui_popupWindow = function(szUrl){
		window.open(szUrl,"test","dependent=yes,alwaysRaised=yes,width=600,height=700,resizable=yes,scrollbars=yes");
	};

	/**
	 * Is called by the map to notify the actual theme (necessary?)
	 */
	ixmaps.htmlgui_setActiveTheme = function(szTheme){
	};

	/**
	 * Is called on resize of hosting window
	 */
	ixmaps.htmlgui_resizeMap = function(fZoomTo,nWidth,nHeight){

		if ( ixmaps.embeddedSVG ){
			if ( nWidth && nHeight ){
				ixmaps.embeddedSVG.window.map.Api.resizeCanvas(0,0,nWidth,nHeight);
			}else{
				ixmaps.embeddedSVG.window.map.Api.resizeCanvas(0,0,ixmaps.embeddedSVG.window.innerWidth,ixmaps.embeddedSVG.window.innerHeight);
			}
		}
		ixmaps.htmlgui_synchronizeMap(false,fZoomTo);
	};


	/**
	 * Is called by the map script when the map is loaded; to get parameter
	 */
	__mapsEmbedA = null;
	__mapsEmbedded = 0;
	__mapsLoaded = 0;

	ixmaps.htmlgui_queryMapFeatures = function(){

		if ( __mapsEmbedA == null ){
			__mapsEmbedA = new Array(0);
			var embedsA = window.document.embeds;
			for ( a in embedsA ){
				if ( a.match(/SVG/)){
					__mapsEmbedA[a] = a;
					__mapsEmbedded++;
				}
			}
		}
		if ( ++__mapsLoaded == __mapsEmbedded ){
			for ( a in __mapsEmbedA ){
				htmlgui_setEmbedName(a);
				}
		}
	};

	/**
	 * Is called for every (embedded) SVG when all (embedded) maps are loaded
	 */
	htmlgui_setEmbedName = function(szEmbed){
		var embeddedSVG = window.document.getElementById(szEmbed);
		// 1. set the name of the embedding object ( necessary because the SVG DOM has no way to know its embedding parent 
		embeddedSVG.window.map.setFeatures("embedname:"+szEmbed);
		// 2. try to call a function, that, if defined, may push init actions for this map; if all parts of the map are loaded, this actions are evaluated
		try{
			htmlgui_queryActions(szEmbed);
		}
		catch (e){
		}
	};

	/**
	 * Is called by the svg map script when the map tool has been changed
	 */
	ixmaps.htmlgui_setMapTool = function(szToolId){
		try	{
			if ( szToolId == "" ){
				 $("#zoom")[0].checked=false; 
				 $("#info")[0].checked=true; 
				 $("#tools").buttonset().refresh();
			}
		}
		catch (e){}
		this.buttonList.onDown("ToolButton_"+szToolId);
		try{
			this.htmlgui_onMapTool(szToolId);
		}
		catch (e){}
	};

	/**
	 * Is called by the svg map script to display messages in a HTML window
	 */
	var infoWindow = null;
	ixmaps.htmlgui_displayInfo = function(szMessage){

		$("#loading-text").empty();
		$("#loading-text").append(szMessage);
		return; 

		if (infoWindow){
			try{
				infoWindow.focus();
			}
			catch (e){
				infoWindow = null;
			}
		}
		if (!infoWindow){
			try{
				infoWindow = window.open("info.html","Info","dependent=yes,alwaysRaised=yes,'toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=300,height=50,left=200,top=200");
			}
			catch (e){
			}
		}
		if (infoWindow){
			var dField = infoWindow.document.getElementById("infofield");
			dField.innerHTML = szMessage;
		}


	};
	/**
	 * Is called by the svg map script to delete messages display in a HTML window
	 */
	ixmaps.htmlgui_killInfo = function(){
		if (infoWindow){
			infoWindow.close();
			infoWindow = null;
		}
	};

	/**
	 * foreward these events to an hosting window, if present
	 */

	ixmaps.htmlgui_onInfoDisplayExtend = function(svgDoc,szId){
		return ixmaps.parentApi.htmlgui_onInfoDisplayExtend(svgDoc,szId);
	};

	ixmaps.htmlgui_onNewTheme = function(szId){
		ixmaps.parentApi.htmlgui_onNewTheme(szId);
	}

	ixmaps.htmlgui_onRemoveTheme = function(szId){
		ixmaps.parentApi.htmlgui_onRemoveTheme(szId);
	}

	ixmaps.htmlgui_onZoomAndPan = function(){
		ixmaps.parentApi.htmlgui_onZoomAndPan();
	}

	// -----------------------------
	// html bookmark handler
	// -----------------------------

	ixmaps.dispatch = function(szUrl){

		if ( String(window.location).match(/localhost/) ){
			return "../../" + szUrl;
		}
		var szHost = "http://"+$(location).attr('host');
		return szHost+ "/" + szUrl;
	};

	ixmaps.getBaseMapParameter = function(szMapService){
		if ( szMapService == "leaflet" ){
			return "&basemap=ll";
		}else
		if ( szMapService == "openlayers" ){
			return "&basemap=ol";
		}else
		if ( szMapService == "microsoft" ){
			return "&basemap=bg";
		}else{
			return "&basemap=go";
		}
	};
	ixmaps.shareMap = function(){
		this.openDialog(null,null,"share.html",'share map','auto',500,550);
	};

	ixmaps.fullScreenMap = function(szTemplateUrl){

		var szMapService = this.szMapService;
		var szMapUrl    = this.htmlgui_getMapUrl();
		var szMapType   = this.htmlgui_getMapTypeId();

		// get envelope 
		var szEnvelope = this.htmlgui_getEnvelopeString(1);
		// get all themes
		var szThemesJS = this.htmlgui_getThemesString();
		// compose bookmark
		var szBookmark = "map.Api.doZoomMapToGeoBounds("+szEnvelope+");" + "map.Api.clearAll();" + szThemesJS;

		// make url of the map template 
		if ( !szTemplateUrl ){
			szTemplateUrl = ixmaps.dispatch("ui/dispatch.htm?ui=full");
		}
		szTemplateUrl += ixmaps.getBaseMapParameter(szMapService);
		// create complete url with query string 
		var szUrl = szTemplateUrl;
		szUrl += szMapUrl?  ("&svggis="		+ encodeURI(szMapUrl))				:"";
		szUrl += szMapType? ("&maptype="	+ szMapType)						:"";
		szUrl += szBookmark?("&bookmark="	+ encodeURIComponent(szBookmark))	:"";

		window.open(szUrl,'map fullscreen'+Math.random());
	};

	ixmaps.popOutMap = function(fFlag,szTemplateUrl){

		var szMapService = this.szMapService;
		var szMapType    = this.htmlgui_getMapTypeId();
		var szMapUrl     = this.htmlgui_getMapUrl();

		// get envelope with zoom factor 3 because the popout window is smaller than the map window
		var szEnvelope = this.htmlgui_getEnvelopeString(3);
		// get all themes
		var szThemesJS = this.htmlgui_getThemesString();
		// compose bookmark
		var szBookmark = "map.Api.doZoomMapToGeoBounds("+szEnvelope+");" + "map.Api.clearAll();" + szThemesJS;

		// make url of the map template 
		if ( !szTemplateUrl ){
			szTemplateUrl = ixmaps.dispatch("ui/dispatch.htm?ui=popout");
		}
		szTemplateUrl += ixmaps.getBaseMapParameter(szMapService);

		// create complete url with query string 
		var szUrl = szTemplateUrl;
		szUrl += "&svggis=" + encodeURI(szMapUrl);
		szUrl += "&maptype=" + szMapType;
		szUrl += "&bookmark=" + encodeURIComponent(szBookmark);

		// alternative store map parameter for child window access
		ixmaps.popoutURL		= szTemplateUrl;
		ixmaps.popoutSVGGIS		= szMapUrl;
		ixmaps.popoutTYPE		= szMapType;
		ixmaps.popoutBOOKMARK	= szBookmark;

		// here we can decide which mode of parameter passing we want (with query string or through ixmaps properties)
		var szPopOutUrl = szUrl;

		if ( !fFlag.match(/window/) ){
			this.openDialog(null,null,szPopOutUrl,'','auto',400,450);
		}
		if ( !fFlag.match(/dialog/) ){
			window.open(szPopOutUrl,'map popout'+Math.random(), 'alwaysRaised=yes, titlebar=no, toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=400, height=450');
		}
	};
	ixmaps.mailMap = function(fFlag,szTemplateUrl){

		var szMapService = this.szMapService;
		var szMapUrl	 = this.htmlgui_getMapUrl();
		var szMapType    = this.htmlgui_getMapTypeId();
		// get envelope 
		var szEnvelope = this.htmlgui_getEnvelopeString(1);
		// get all themes
		var szThemesJS = this.htmlgui_getThemesString();
		// compose bookmark
		var szBookmark = "map.Api.doZoomMapToGeoBounds("+szEnvelope+");"+szThemesJS;

		var szHost = "http://"+$(location).attr('host');

		// make url of the map template 
		if ( !szTemplateUrl ){
			szTemplateUrl = ixmaps.dispatch("ui/dispatch.htm?ui=full");
		}
		szTemplateUrl += ixmaps.getBaseMapParameter(szMapService);

		// create complete url with query string 
		var szUrl = szHost + szTemplateUrl;
		szUrl += "?svggis=" + encodeURI(szMapUrl);
		szUrl += "&maptype=" + szMapType;
		szUrl += "&bookmark=" + encodeURIComponent(szBookmark);

		var szSubject = "iXmaps - map link sent by user";		
		var szBody    = "This email was sent to you by a user of iXmaps:\n\n"+
						"The below link will open an interactive SVG map in HTML5 enabled browser (Chrome, Firefox and Safari):\n\n";		
		var szBody2   = "\n\n(the link may be long because it contains zoom and charting parameter)\n";		
		location.href='mailto:?subject='+szSubject+'&body='+encodeURI(szBody)+encodeURIComponent(szUrl)+encodeURI(szBody2)+'';
	};

	ixmaps.htmlgui_getMapUrl = function(){
		return decodeURI(ixmaps.szUrlSVG);
	};
	ixmaps.htmlgui_getMapTypeId = function(){
		return htmlMap_getMapTypeId();
	};
	ixmaps.htmlgui_setMapTypeId = function(szId){
		return htmlMap_setMapTypeId(szId);
	};
	ixmaps.htmlgui_saveBookmark = function(){
		ixmaps.htmlgui_doSaveBookmark();
//		ixmaps.openDialog('dialog','../../resources/html/help/help.html','?');
	};
	ixmaps.htmlgui_doSaveBookmark = function(szName){

		var szBookMarkJS = this.htmlgui_getBookmarkString();

		htmlgui_setCookie("test", szBookMarkJS);
		this.embeddedSVG.window.map.Api.displayMessage("Bookmark saved",1000);
	};

	ixmaps.htmlgui_getEnvelopeString = function(nZoom){

		var arrayPtLatLon = this.embeddedSVG.window.map.Api.getBoundsOfMapInGeoBounds();
		arrayPtLatLon[0].x = Math.max(Math.min(arrayPtLatLon[0].x,180),-180);
		arrayPtLatLon[0].y = Math.max(Math.min(arrayPtLatLon[0].y,80),-80);
		arrayPtLatLon[1].x = Math.max(Math.min(arrayPtLatLon[1].x,180),-180);
		arrayPtLatLon[1].y = Math.max(Math.min(arrayPtLatLon[1].y,80),-80);
		
		var mX = (arrayPtLatLon[1].x+arrayPtLatLon[0].x)/2;
		var mY = (arrayPtLatLon[1].y+arrayPtLatLon[0].y)/2;

		var dX = (arrayPtLatLon[1].x-arrayPtLatLon[0].x);
		var dY = (arrayPtLatLon[1].y-arrayPtLatLon[0].y);

		dX = dX / (2*Math.max(1,nZoom));
		dY = dY / (2*Math.max(1,nZoom));

		var szEnvelope = String(mY-dY) +","+
						 String(mX-dX) +","+
						 String(mY+dY) +","+
						 String(mX+dX);

		return szEnvelope;
	};

	ixmaps.htmlgui_getThemesString = function(){

		var szThemesJS = ixmaps.htmlgui_getParamString();
		var szThemesA	  = this.embeddedSVG.window.map.Api.getMapThemeDefinitionStrings();
		for ( var i=0; i<szThemesA.length; i++){
			szThemesJS += szThemesA[i];
		}
		
		return szThemesJS;
	};
	ixmaps.htmlgui_getParamString = function(){

		var scaleParam = this.embeddedSVG.window.map.Api.getScaleParam();
		return "map.Api.setScaleParam("+JSON.stringify(scaleParam)+");";
	};

	ixmaps.htmlgui_getBookmarkString = function(nZoom){

		if ( !nZoom ){
			nZoom = 1;
		}
		var szBookMarkJS = "";
		var szEnvelope = this.htmlgui_getEnvelopeString(nZoom);

		// make executable SVG map API call
		szBookMarkJS += "map.Api.doZoomMapToGeoBounds("+szEnvelope+");";

		szBookMarkJS += this.htmlgui_getThemesString();

		return szBookMarkJS;
	};

	ixmaps.htmlgui_loadBookmark = function(){

		try	{
			// get the bookmark
			var xxx = htmlgui_getCookie("test");
			// if bookmark includes map themes, clear map first
			if ( xxx.match(/newMapTheme/) ){
				this.clearAll();
			}
			// GR 05.09.2011 magick !!
			ixmaps.htmlgui_synchronizeMap(false,true);

			// execute bookmark, which are direct Javascript calls
			this.embeddedSVG.window.map.Api.executeJavascriptWithMessage(xxx,"-> Bookmark",100);

//			// force HTML map synchronisation 
//			setTimeout('ixmaps.htmlgui_synchronizeMap(false,true);',100);
		}
		catch (e){
			try{
				ixmaps.embeddedSVG.window.map.Api.displayMessage("no bookmark found !",1000);
			}catch (e){
				alert("no bookmark found!");
			}
		}
	};
	
	ixmaps.storedBookmarkA = new Array(0);

	ixmaps.execBookmark = function(szBookmark,fClear){

		if ( !this.embeddedSVG || !this.embeddedSVG.window || !this.embeddedSVG.window.map.Api ){
			ixmaps.pushBookmark(szBookmark);
			return;
		}

		if ( !szBookmark || typeof(szBookmark) == "undefined" ){
			this.embeddedSVG.window.map.Api.displayMessage("Bookmark undefined",1000);
			return;
		}

		if ( fClear ){
			this.clearAll();
		}
		// execute bookmark, which are direct Javascript calls
		this.embeddedSVG.window.map.Api.executeJavascriptWithMessage(szBookmark,"-> Bookmark",100);

		// force HTML map synchronisation 
		if ( 0 && szBookmark.match(/doCenterMapToGeoBounds/) ){
			this.HTML_hideMap();
			setTimeout('ixmaps.htmlgui_synchronizeMap(false,true);',1000);
		}
	};

	ixmaps.pushBookmark = function(szBookmark){
		ixmaps.storedBookmarkA.push(szBookmark);
		setTimeout("ixmaps.popBookmark()",100);
	};
	ixmaps.popBookmark = function(){
		if ( !this.embeddedSVG ){
			setTimeout("ixmaps.popBookmark()",100);
			return;
		}
		if ( ixmaps.storedBookmarkA.length ){
			ixmaps.execBookmark(ixmaps.storedBookmarkA.pop());
			setTimeout("ixmaps.popBookmark()",100);
		}
	};

	ixmaps.execScript = function(szScript,fClear){
		if ( fClear ){
			if ( szTheme.match(/CHOROPLETHE/) ){
				ixmaps.embededApi.clearAllChoroplethe();
			}else{
				ixmaps.embededApi.clearAllCharts();
			}
		}
		eval('ixmaps.embeddedSVG.window.'+szScript);
	};

	// -----------------------------
	// popup window handler
	// -----------------------------

	popupTools = function(szUrl){
			if (ixmaps.toolsWindow){
				try{
					ixmaps.toolsWindow.focus();
				}
				catch (e){
					ixmaps.toolsWindow = null;
				}
			}
			if (!ixmaps.toolsWindow || ixmaps.toolsWindow.closed){
				if ( szUrl == null || szUrl.length < 2 ){
					szUrl = "../../../resources/html/popupresult.html";
				}
	//			ixmaps.toolsWindow = window.open(szUrl,"test","dependent=yes,alwaysRaised=yes,titlebar=no,width=400,height=500,resizable=yes,screenX=200,screenY=100");
				ixmaps.toolsWindow = window.open(szUrl,"test",
					"dependent=yes,alwaysRaised=yes,addressbar=no,titlebar=no,width=400,height=600,resizable=yes,screenX=200,screenY=100");
			}
	};
	remove_popupTools = function(){
			if ( ixmaps.toolsWindow ){
				ixmaps.toolsWindow.close();
			}
	};

	popupResult = function(szUrl){
			if (resultWindow){
				try{
					resultWindow.focus();
				}
				catch (e){
					resultWindow = null;
				}
			}
			if (!resultWindow){
				if ( szUrl == null || szUrl.length < 2 ){
					szUrl = "../../../resources/html/popupresult.html";
				}
				resultWindow = window.open(szUrl,"test","dependent=yes,alwaysRaised=yes,titlebar=no,width=400,height=500,resizable=yes,screenX=200,screenY=100");
			}
	};
	remove_popupHelp = function(){
			if ( ixmaps.helpWindow ){
				ixmaps.helpWindow.close();
			}
	};

	popupHelp = function(szUrl){
			if (ixmaps.helpWindow){
				try{
					ixmaps.helpWindow.focus();
				}
				catch (e){
					ixmaps.helpWindow = null;
				}
			}
			if (!ixmaps.helpWindow){
				if ( szUrl == null || szUrl.length < 2 ){
					szUrl = "../html/help/help.html";
				}
				ixmaps.helpWindow = window.open(szUrl,"test","dependent=yes,alwaysRaised=yes,width=600,height=700,resizable=yes,scrollbars=yes");
			}
	};

	function htmlgui_contextualSearch(szField){
		if (typeof(contextualSearch) != "undefined" ){
			contextualSearch(szField);
		}
		else{
			popupTools('popup.html');
			setTimeout("ixmaps.toolsWindow.contextualSearch('"+szField+"')",10);
		}
	}
	function htmlgui_showContextInfo(){
		try{
	//		var ixmaps.embeddedSVG = map;
			var szId = ixmaps.embeddedSVG.window.map.Event.getContextMenuObjId();
			ixmaps.embeddedSVG.window.map.Api.displayContextMenuTargetInfo();
		}
		catch(e){
			alert("map api error!");
		}
	}
	function htmlgui_createContextBuffer(){
		try{
			var szId = ixmaps.embeddedSVG.window.map.Event.getContextMenuObjId();
			ixmaps.embeddedSVG.window.map.Api.createContextMenuTargetBuffer();
		}
		catch(e){
			alert("map api error!");
		}
	}

	// ----------------------------------------------------------------------
	// basic HTML button handler
	// ----------------------------------------------------------------------

	ButtonList = function(){
		this.buttonList = new Array(0);
	};
	ButtonList.prototype.addButton = function(szId,paramObj){
		var button = new ButtonEntry(szId,paramObj.group,paramObj.over,paramObj.overon,paramObj.on,paramObj.enable,paramObj.disable);
		this.buttonList[this.buttonList.length] = button;
		return button;
	};
	ButtonList.prototype.getButton = function(szId){
		for ( var i=0; i<this.buttonList.length; i++ ){
			if ( this.buttonList[i].szId == szId ) {
				return this.buttonList[i];
			}
		}
		return null;
	};
	ButtonList.prototype.onOver = function(szId,szGroup,szOverImage,szOverPressedImage,szPressedImage){
		var myButton = this.getButton(szId);
		if ( myButton == null ){
			myButton = this.addButton(szId,szGroup,szOverImage,szOverPressedImage,szPressedImage);
		}
		this.overButton = myButton;
		this.overButton.targetNode.src = this.overButton.isPressed ? this.overButton.szOverPressed : this.overButton.szOver;
	};
	ButtonList.prototype.onDown = function(szId){
		if (this.executing){
			return;
		}
		if ( this.overButton ){
			if ( this.overButton.isPressed ){
				this.overButton.isPressed = false;
			}
			else{
				this.reset(this.overButton.szGroup);
				this.overButton.isPressed = true;
			}
			this.overButton.targetNode.src = this.overButton.isPressed ? this.overButton.szOverPressed : this.overButton.szOver;
		}
		else{
			if ( szId && (szId.length > 0) ){
				this.overButton = this.getButton(szId);
				this.onDown();
				this.overButton = null;
			}
		}
	};
	ButtonList.prototype.onClick = function(){
		this.executing = true;
		if ( this.overButton ){
			if ( this.overButton.isPressed ){
				if ( this.overButton.szEnable ){
					eval(this.overButton.szEnable);
				}
			}else{
				if ( this.overButton.szDisable ){
					eval(this.overButton.szDisable);
				}
			}
		}
		this.executing = false;
	};
	ButtonList.prototype.onOut = function(){
		if ( this.overButton ){
			this.overButton.targetNode.src = this.overButton.isPressed ? this.overButton.szPressed : this.overButton.szOrig;
		}
		this.overButton = null;
	};
	ButtonList.prototype.reset = function(szGroup){
		// avoid recursing from SVG upcall
		if (this.executing){
			return;
		}
		this.executing = true;
		for ( var i=0; i<this.buttonList.length; i++ ){
			if ( szGroup && ((szGroup == "all") || (szGroup == this.buttonList[i].szGroup)) ){
				if ( this.buttonList[i].isPressed ){
					this.buttonList[i].isPressed = false;
					this.buttonList[i].targetNode.src = this.buttonList[i].szOrig;
					if (this.buttonList[i].szDisable ){
						eval(this.buttonList[i].szDisable);
					}
				}
			}
		}
		this.executing = false;
	};
	function ButtonEntry(szId,szGroup,szOverImage,szOverPressedImage,szPressedImage,szEnable,szDisable){
		var targetNode = window.document.getElementById(szId);	
		if ( targetNode == null ){
			return null;
		}
		this.szId = szId;
		this.targetNode = targetNode;
		this.szGroup = szGroup;
		this.szOrig = targetNode.src;
		this.szOver = szOverImage;
		this.szOverPressed = szOverPressedImage;
		this.szPressed = szPressedImage;
		this.isPressed = false;

		targetNode.setAttribute("onmouseover","javascript:ixmaps.buttonList.onOver('"+szId+"');");
		targetNode.setAttribute("onmouseout","javascript:ixmaps.buttonList.onOut('"+szId+"');");
		targetNode.setAttribute("onmousedown","javascript:ixmaps.buttonList.onDown('"+szId+"');");
		if ( szEnable || szDisable ){
			this.szEnable = szEnable;
			this.szDisable = szDisable;
			targetNode.setAttribute("onclick","javascript:ixmaps.buttonList.onClick('"+szId+"');return false;");
		}
	}

	ixmaps.buttonList = new ButtonList();		

	// -----------------------------
	// helper
	// -----------------------------

	htmlgui_getEmbeddedSVG = function(){
		return ixmaps.embeddedSVG;
	};

	_HTML_TRACE = function(szMessage){
		if ( typeof(console) != "undefined"  && typeof(console.log) != "undefined"  ){
			console.log("_TRACE:"+szMessage);
		}
	};

	function htmlgui_setCookie(szName,szValue){
			var expDays = 30;
			var exp = new Date(); 
			exp.setTime(exp.getTime() + (expDays*24*60*60*1000));
			SetCookie(window.URL+ixmaps.szUrlSVG+szName, szValue, exp);
	}
	function htmlgui_getCookie(szName){
			if ( !ixmaps.szUrlSVG || typeof(ixmaps.szUrlSVG) != "string" ){
				return null;
			}
			return GetCookie(window.URL+ixmaps.szUrlSVG+szName);
	}
	function htmlgui_deleteCookie(szName){
			DeleteCookie(window.URL+ixmaps.szUrlSVG+szName);
	}

	// -----------------------------
	// mouse wheel interception
	// -----------------------------

	/** This is high-level function; REPLACE IT WITH YOUR CODE.
	 * It must react to delta being more/less than zero.
	 */
	function handle(delta) {
		eval("window.status = String(delta)");
		if (delta < 0)
			/* something. */;
		else
			/* something. */;
	}

	function wheel(event){
		var delta = 0;
		if (!event) event = window.event;
		if (event.wheelDelta) {
			delta = event.wheelDelta/120; 
			if (window.opera) delta = -delta;
		} else if (event.detail) {
			delta = -event.detail/3;
		}
		if (delta)
			handle(delta);
			if (event.preventDefault)
					event.preventDefault();
			event.returnValue = false;
	}

	/** Initialization code. 
	 * If you use your own event management code, change it as required.
	 */
	if (window.addEventListener)
			/** DOMMouseScroll is for mozilla. */
			window.addEventListener('DOMMouseScroll', wheel, false);
	/** IE/Opera. */
	window.onmousewheel = document.onmousewheel = wheel;


	// -----------------------------
	// cookie handler
	// -----------------------------

	//-- Original:  Mattias Sjoberg -->

	//-- This script and many more are available free online at -->
	//-- The JavaScript Source!! http://javascript.internet.com -->

	var expDays = 30;
	var exp = new Date(); 
	exp.setTime(exp.getTime() + (expDays*24*60*60*1000));
	function color(){
	var favColor = GetCookie('color');
	if (favColor == null) {
	favColor = prompt("What is your favorite background color?");
	SetCookie('color', favColor, exp);
	}
	document.bgColor=favColor;
	return favColor;
	}
	function set(){
	favColor = prompt("What is your favorite background color?");
	SetCookie ('color', favColor, exp);
	}
	function getCookieVal (offset) {  
	var endstr = document.cookie.indexOf (";", offset);  
	if (endstr == -1)    
	endstr = document.cookie.length;  
	return unescape(document.cookie.substring(offset, endstr));
	}
	function GetCookie (name) {
	var arg = name + "=";  
	var alen = arg.length;  
	var clen = document.cookie.length;  
	var i = 0;  
	while (i < clen) {    
	var j = i + alen;    
	if (document.cookie.substring(i, j) == arg)      
	return getCookieVal (j);    
	i = document.cookie.indexOf(" ", i) + 1;    
	if (i == 0) break;   
	}  
	return null;
	}
	function SetCookie (name, value) {  
	var argv = SetCookie.arguments;  
	var argc = SetCookie.arguments.length;  
	var expires = (argc > 2) ? argv[2] : null;  
	var path = (argc > 3) ? argv[3] : null;  
	var domain = (argc > 4) ? argv[4] : null;  
	var secure = (argc > 5) ? argv[5] : false;  
	document.cookie = name + "=" + escape (value) + 
	((expires == null) ? "" : ("; expires=" + expires.toGMTString())) + 
	((path == null) ? "" : ("; path=" + path)) +  
	((domain == null) ? "" : ("; domain=" + domain)) +    
	((secure == true) ? "; secure" : "");
	}
	function DeleteCookie (name) {  
	var exp = new Date();  
	exp.setTime (exp.getTime() - 1);  
	var cval = GetCookie (name);  
	document.cookie = name + "=" + cval + "; expires=" + exp.toGMTString();
	}
	//-- cookies:  end script -->


	var _prettyPrintWnd = null;
	var _prettyPrintHeadline = null;
	var _prettyPrintContent = null;
	ixmaps.htmlgui_prettyPrintXML = function(szHeadline,szPrint){
		// opens a new windows and puts the original unformatted source code inside.
		_prettyPrintWnd = window.open('../../../js/syntaxhighlighter/listxml.html', '_blank', 'width=750, height=600, location=0, resizable=1, menubar=0, scrollbars=1');
		_prettyPrintHeadline = szHeadline;
		_prettyPrintContent = szPrint;
		setTimeout("__prettyPrintXML()",1000);
	}	
	__prettyPrintXML = function(){

		var arcxmlTitle = _prettyPrintWnd.document.getElementById("headline");
		arcxmlTitle.innerText = _prettyPrintHeadline ;

		var arcxmlArea = _prettyPrintWnd.document.getElementById("arcxml");
		arcxmlArea.innerText = "\n"+_prettyPrintContent+"\n" ;

		setTimeout("_prettyPrintWnd.dp.SyntaxHighlighter.HighlightAll('jscript',false)",500);

	//	_prettyPrintWnd.document.close();

	};

}( window.ixmaps = window.ixmaps || {}, jQuery ));

// -----------------------------
// EOF
// -----------------------------
