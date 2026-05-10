import { Crosshair, MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import {
  Cartesian3,
  Cartesian2,
  Cartographic,
  buildModuleUrl,
  Color,
  CustomDataSource,
  EllipsoidTerrainProvider,
  HorizontalOrigin,
  ImageryLayer,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  TileMapServiceImageryProvider,
  VerticalOrigin,
  Viewer,
} from "cesium";

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export default function Map({
  locations = [],
  selectedLocationId,
  draftLocation,
  focusLocation,
  onMapClick,
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const markerLayerRef = useRef(null);
  const clickHandlerRef = useRef(null);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) {
      return undefined;
    }

    const viewer = new Viewer(containerRef.current, {
      animation: false,
      baseLayer: ImageryLayer.fromProviderAsync(
        TileMapServiceImageryProvider.fromUrl(
          buildModuleUrl("Assets/Textures/NaturalEarthII"),
        ),
      ),
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      shouldAnimate: true,
      timeline: false,
      terrainProvider: new EllipsoidTerrainProvider(),
    });

    viewer.scene.globe.enableLighting = true;
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 1000;
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 20000000;
    viewerRef.current = viewer;

    const markerLayer = new CustomDataSource("saved-locations");
    markerLayerRef.current = markerLayer;
    viewer.dataSources.add(markerLayer);

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement) => {
      const cartesian = viewer.camera.pickEllipsoid(
        movement.position,
        viewer.scene.globe.ellipsoid,
      );
      if (!cartesian) {
        return;
      }
      const cartographic = Cartographic.fromCartesian(cartesian);
      onMapClickRef.current?.({
        latitude: Number(CesiumMath.toDegrees(cartographic.latitude).toFixed(6)),
        longitude: Number(CesiumMath.toDegrees(cartographic.longitude).toFixed(6)),
      });
    }, ScreenSpaceEventType.LEFT_CLICK);
    clickHandlerRef.current = handler;

    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(20, 22, 6400000),
    });

    return () => {
      clickHandlerRef.current?.destroy();
      viewer.destroy();
      viewerRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const markerLayer = markerLayerRef.current;
    if (!markerLayer) {
      return;
    }

    markerLayer.entities.removeAll();

    locations.forEach((location) => {
      const latitude = toNumber(location.latitude);
      const longitude = toNumber(location.longitude);
      if (latitude === null || longitude === null) {
        return;
      }

      const isSelected = Number(selectedLocationId) === Number(location.id);
      markerLayer.entities.add({
        id: `location-${location.id}`,
        name: location.name,
        position: Cartesian3.fromDegrees(longitude, latitude),
        point: {
          color: isSelected ? Color.fromCssColorString("#ffb020") : Color.fromCssColorString("#18b7a5"),
          outlineColor: Color.WHITE,
          outlineWidth: 2,
          pixelSize: isSelected ? 15 : 11,
        },
        label: {
          text: location.name,
          fillColor: Color.WHITE,
          font: "600 13px Inter, system-ui, sans-serif",
          outlineColor: Color.fromCssColorString("#1e293b"),
          outlineWidth: 3,
          horizontalOrigin: HorizontalOrigin.LEFT,
          verticalOrigin: VerticalOrigin.CENTER,
          pixelOffset: new Cartesian2(13, 0),
          showBackground: true,
          backgroundColor: Color.fromCssColorString("#1f2937").withAlpha(0.72),
        },
      });
    });

    const draftLatitude = toNumber(draftLocation?.latitude);
    const draftLongitude = toNumber(draftLocation?.longitude);
    if (draftLatitude !== null && draftLongitude !== null) {
      markerLayer.entities.add({
        id: "draft-location",
        name: "New location",
        position: Cartesian3.fromDegrees(draftLongitude, draftLatitude),
        point: {
          color: Color.fromCssColorString("#f97316"),
          outlineColor: Color.WHITE,
          outlineWidth: 2,
          pixelSize: 13,
        },
        label: {
          text: "New location",
          fillColor: Color.WHITE,
          font: "600 13px Inter, system-ui, sans-serif",
          outlineColor: Color.fromCssColorString("#1e293b"),
          outlineWidth: 3,
          horizontalOrigin: HorizontalOrigin.LEFT,
          verticalOrigin: VerticalOrigin.CENTER,
          pixelOffset: new Cartesian2(13, 0),
          showBackground: true,
          backgroundColor: Color.fromCssColorString("#9a3412").withAlpha(0.76),
        },
      });
    }
  }, [draftLocation, locations, selectedLocationId]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const latitude = toNumber(focusLocation?.latitude);
    const longitude = toNumber(focusLocation?.longitude);
    if (!viewer || latitude === null || longitude === null) {
      return;
    }

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(longitude, latitude, 950000),
      duration: 0.8,
    });
  }, [focusLocation]);

  return (
    <section className="map-panel" aria-label="Interactive satellite tracking globe">
      <div ref={containerRef} className="cesium-map" />
      <div className="map-help">
        <span>
          <MapPin size={15} aria-hidden="true" />
          Click the globe to set coordinates
        </span>
        <span>
          <Crosshair size={15} aria-hidden="true" />
          Saved sites are pinned
        </span>
      </div>
    </section>
  );
}
