<template>
  <q-page class="location-page q-pa-md">
    <div class="location-container">
      <!-- Header -->
      <div class="row items-center justify-between q-mb-lg">
        <div>
          <h5 class="q-my-none text-weight-bold page-title">พิกัดร้านและขอบเขตการสั่ง</h5>
          <p class="text-caption text-grey-7 q-mb-none">
            กำหนดตำแหน่งร้านบนแผนที่และตั้งค่าระยะรัศมีเพื่อป้องกันการสั่งอาหารนอกร้าน
          </p>
        </div>
        <q-btn
          color="primary"
          unelevated
          no-caps
          rounded
          icon="save"
          label="บันทึกการตั้งค่า"
          @click="handleSave"
          :loading="isSaving"
          class="save-btn"
        />
      </div>

      <!-- Loading skeleton -->
      <LoadingSkeleton v-if="isLoading" type="tables" :count="2" />

      <div v-else class="row q-col-gutter-lg">
        <!-- Map Card (Left / Main) -->
        <div class="col-12 col-md-7 col-lg-8">
          <q-card class="map-card">
            <q-card-section class="q-pa-md row items-center justify-between">
              <div class="row items-center">
                <q-icon name="pin_drop" color="primary" size="22px" class="q-mr-xs" />
                <span class="text-subtitle1 text-weight-bold">ปักหมุดตำแหน่งร้าน</span>
              </div>
              <q-btn
                flat
                dense
                no-caps
                color="primary"
                icon="my_location"
                label="ใช้พิกัดปัจจุบันของฉัน"
                :loading="isLocating"
                @click="locateMe"
                class="location-btn"
              />
            </q-card-section>

            <q-separator />

            <div class="map-wrapper">
              <div ref="mapContainer" class="map-view"></div>
              <div class="map-hint-overlay">
                <q-icon name="touch_app" size="16px" class="q-mr-xs" />
                คลิกบนแผนที่หรือลากหมุดเพื่อเปลี่ยนตำแหน่งร้าน
              </div>
            </div>
          </q-card>
        </div>

        <!-- Controls Card (Right) -->
        <div class="col-12 col-md-5 col-lg-4">
          <div class="column q-gutter-md">
            <!-- Geofencing Status Toggle Card -->
            <q-card class="setting-card">
              <q-card-section>
                <div class="row items-center justify-between no-wrap">
                  <div class="q-pr-md">
                    <div class="text-subtitle2 text-weight-bold">ระบบตรวจสอบพิกัด (Geofencing)</div>
                    <div class="text-caption text-grey-7">
                      {{
                        isGeofenceEnabled
                          ? 'เปิดใช้งาน: บล็อกการสั่งอาหารหากอยู่นอกรัศมีร้าน'
                          : 'ปิดใช้งาน: อนุญาตให้สั่งได้โดยไม่เช็คพิกัด'
                      }}
                    </div>
                  </div>
                  <q-toggle v-model="isGeofenceEnabled" color="primary" keep-color size="lg" />
                </div>
              </q-card-section>
            </q-card>

            <!-- Radius Settings Card -->
            <q-card class="setting-card">
              <q-card-section>
                <div class="row items-center justify-between q-mb-sm">
                  <div class="text-subtitle2 text-weight-bold">ระยะรัศมีที่อนุญาต</div>
                  <q-badge color="primary" class="text-subtitle2 text-weight-bold q-px-sm">
                    {{ radiusMeters }} เมตร
                  </q-badge>
                </div>
                <div class="text-caption text-grey-7 q-mb-md">
                  ลูกค้าต้องอยู่ในรัศมีนี้จากจุดปักหมุด จึงจะสามารถกดยืนยันออเดอร์ได้
                </div>

                <q-slider
                  v-model="radiusMeters"
                  :min="20"
                  :max="500"
                  :step="10"
                  label
                  :label-value="`${radiusMeters} ม.`"
                  color="primary"
                  class="q-mt-sm"
                  @update:model-value="updateCircleRadius"
                />

                <div class="row justify-between text-caption text-grey-6 q-mt-xs">
                  <span>20 เมตร (ในร้าน)</span>
                  <span>100 เมตร (บริเวณร้าน)</span>
                  <span>500 เมตร (กว้าง)</span>
                </div>

                <!-- Quick Presets -->
                <div class="row q-gutter-xs q-mt-md">
                  <q-btn
                    v-for="preset in radiusPresets"
                    :key="preset"
                    outline
                    dense
                    size="sm"
                    no-caps
                    :color="radiusMeters === preset ? 'primary' : 'grey-7'"
                    :class="{ 'bg-primary-soft': radiusMeters === preset }"
                    :label="`${preset} เมตร`"
                    @click="setPresetRadius(preset)"
                    class="preset-btn"
                  />
                </div>
              </q-card-section>
            </q-card>

            <!-- Coordinates Inputs Card -->
            <q-card class="setting-card">
              <q-card-section>
                <div class="text-subtitle2 text-weight-bold q-mb-xs">พิกัดทางภูมิศาสตร์</div>
                <div class="text-caption text-grey-7 q-mb-md">
                  Latitude และ Longitude ของตำแหน่งที่ปักหมุด
                </div>

                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <q-input
                      v-model.number="latInput"
                      outlined
                      dense
                      type="number"
                      step="0.0001"
                      label="Latitude"
                      @change="handleManualCoordinateChange"
                    />
                  </div>
                  <div class="col-6">
                    <q-input
                      v-model.number="lngInput"
                      outlined
                      dense
                      type="number"
                      step="0.0001"
                      label="Longitude"
                      @change="handleManualCoordinateChange"
                    />
                  </div>
                </div>

                <div class="row items-center q-mt-sm text-caption text-grey-6">
                  <q-icon name="info" size="14px" class="q-mr-xs" />
                  <span>สามารถแก้ไขพิกัดตัวเลข หรือคลิกปักหมุดบนแผนที่ได้โดยตรง</span>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import L from 'leaflet';
import { useNotify } from 'src/composables/useNotify';
import { fetchRestaurant, updateRestaurantLocation } from 'src/services/restaurantService';
import { getCurrentPosition } from 'src/utils/geoUtils';
import LoadingSkeleton from 'src/components/LoadingSkeleton.vue';
import type { Restaurant } from 'src/types/database';

const { notifySuccess, notifyError, notifyWarning } = useNotify();

const isLoading = ref(true);
const isSaving = ref(false);
const isLocating = ref(false);

const restaurant = ref<Restaurant | null>(null);
const mapContainer = ref<HTMLDivElement | null>(null);

// Geolocation state
const latInput = ref(13.2849);
const lngInput = ref(100.9234);
const radiusMeters = ref(100);
const isGeofenceEnabled = ref(true);

const radiusPresets = [30, 50, 100, 200, 300];

// Leaflet instances
let map: L.Map | null = null;
let marker: L.Marker | null = null;
let circle: L.Circle | null = null;

// Custom pin icon with warm terracotta theme
const customPinIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `
    <div style="
      background-color: #e05836;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(224, 88, 54, 0.45);
      border: 2px solid #ffffff;
    ">
      <div style="
        width: 10px;
        height: 10px;
        background-color: #ffffff;
        border-radius: 50%;
      "></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

onMounted(async () => {
  try {
    const res = await fetchRestaurant();
    if (res) {
      restaurant.value = res;
      if (res.latitude && res.longitude) {
        latInput.value = res.latitude;
        lngInput.value = res.longitude;
      }
      if (res.geofence_radius_meters) {
        radiusMeters.value = res.geofence_radius_meters;
      }
      if (res.is_geofence_enabled !== undefined) {
        isGeofenceEnabled.value = res.is_geofence_enabled;
      }
    }
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลร้านค้าได้');
  } finally {
    isLoading.value = false;
    await nextTick();
    initMap();
  }
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

function initMap() {
  if (!mapContainer.value) return;

  const initialLat = latInput.value;
  const initialLng = lngInput.value;

  map = L.map(mapContainer.value, {
    center: [initialLat, initialLng],
    zoom: 16,
    zoomControl: true,
  });

  // OpenStreetMap Tile Layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);

  // Marker
  marker = L.marker([initialLat, initialLng], {
    icon: customPinIcon,
    draggable: true,
  }).addTo(map);

  marker.on('drag', (e: L.LeafletEvent) => {
    const target = e.target as L.Marker;
    const pos = target.getLatLng();
    latInput.value = Number(pos.lat.toFixed(6));
    lngInput.value = Number(pos.lng.toFixed(6));
    if (circle) circle.setLatLng(pos);
  });

  // Circle
  circle = L.circle([initialLat, initialLng], {
    radius: radiusMeters.value,
    color: '#e05836',
    fillColor: '#e05836',
    fillOpacity: 0.18,
    weight: 2,
    dashArray: '6, 6',
  }).addTo(map);

  // Click on map to reposition pin
  map.on('click', (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    latInput.value = Number(lat.toFixed(6));
    lngInput.value = Number(lng.toFixed(6));
    if (marker) marker.setLatLng([lat, lng]);
    if (circle) circle.setLatLng([lat, lng]);
  });
}

function updateCircleRadius() {
  if (circle) {
    circle.setRadius(radiusMeters.value);
  }
}

function setPresetRadius(preset: number) {
  radiusMeters.value = preset;
  updateCircleRadius();
}

function handleManualCoordinateChange() {
  const lat = Number(latInput.value);
  const lng = Number(lngInput.value);
  if (isNaN(lat) || isNaN(lng)) return;

  if (map && marker && circle) {
    marker.setLatLng([lat, lng]);
    circle.setLatLng([lat, lng]);
    map.setView([lat, lng], map.getZoom());
  }
}

async function locateMe() {
  isLocating.value = true;
  try {
    const result = await getCurrentPosition();
    if (result.success) {
      latInput.value = Number(result.latitude.toFixed(6));
      lngInput.value = Number(result.longitude.toFixed(6));

      if (map && marker && circle) {
        marker.setLatLng([result.latitude, result.longitude]);
        circle.setLatLng([result.latitude, result.longitude]);
        map.setView([result.latitude, result.longitude], 17);
      }
      notifySuccess('ดึงพิกัดปัจจุบันของคุณสำเร็จแล้ว');
    } else {
      notifyWarning(result.message);
    }
  } finally {
    isLocating.value = false;
  }
}

async function handleSave() {
  if (!restaurant.value) return;
  isSaving.value = true;
  try {
    await updateRestaurantLocation(restaurant.value.id, {
      latitude: latInput.value,
      longitude: lngInput.value,
      geofence_radius_meters: radiusMeters.value,
      is_geofence_enabled: isGeofenceEnabled.value,
    });
    notifySuccess('บันทึกพิกัดร้านและการตั้งค่า Geofencing เรียบร้อยแล้ว');
  } catch (err) {
    notifyError(err instanceof Error ? err.message : 'บันทึกข้อมูลไม่สำเร็จ');
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.location-page {
  background: var(--color-background);
}

.location-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  color: var(--color-text-primary);
  line-height: 1.2;
}

.save-btn {
  padding: 8px 24px;
  font-weight: 600;
  box-shadow: var(--shadow-subtle);
}

.map-card {
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-subtle);
  overflow: hidden;
  background: #ffffff;
}

.map-wrapper {
  position: relative;
  width: 100%;
  height: 520px;
}

.map-view {
  width: 100%;
  height: 100%;
  z-index: 1;
}

.map-hint-overlay {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  padding: 6px 16px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  box-shadow: var(--shadow-card);
  z-index: 1000;
  pointer-events: none;
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.setting-card {
  background: #ffffff;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-subtle);
}

.location-btn {
  font-weight: 600;
  border-radius: var(--radius-sm);
}

.preset-btn {
  border-radius: var(--radius-pill);
  padding: 2px 10px;
}

.bg-primary-soft {
  background: var(--color-primary-soft) !important;
}

@media (max-width: 599px) {
  .map-wrapper {
    height: 380px;
  }
}
</style>
