<template>
  <q-menu
    anchor="bottom right"
    self="top right"
    class="queue-audio-menu shadow-float"
    :offset="[0, 8]"
  >
    <div class="column q-gutter-y-sm audio-menu-inner">
      <!-- Header with Switch -->
      <div class="row items-center justify-between">
        <div class="row items-center q-gutter-x-xs">
          <q-icon
            :name="soundEnabled ? 'notifications_active' : 'notifications_off'"
            :color="soundEnabled ? 'primary' : 'grey-6'"
            size="20px"
          />
          <span class="text-weight-bold text-subtitle2 text-ink">เสียงเตือนออเดอร์</span>
        </div>
        <q-toggle
          v-model="soundEnabled"
          color="primary"
          dense
          @update:model-value="onSoundToggle"
        />
      </div>

      <q-separator class="apple-hairline q-my-xs" />

      <!-- Sound Type Selector -->
      <div class="column q-gutter-y-xs" :class="{ 'text-muted-light': !soundEnabled }">
        <span class="text-caption text-weight-medium text-body">ประเภทเสียงแจ้งเตือน</span>
        <div class="row q-gutter-xs">
          <q-btn
            size="sm"
            :unelevated="soundType === 'voice'"
            :outline="soundType !== 'voice'"
            dense
            :disable="!soundEnabled"
            :color="soundType === 'voice' ? 'primary' : 'grey-7'"
            label="🗣️ เสียงพูด"
            class="col q-py-xs apple-pill-btn"
            @click="onSoundTypeChange('voice')"
          >
            <q-tooltip>เสียงคนพูดแจ้งเตือน</q-tooltip>
          </q-btn>
          <q-btn
            size="sm"
            :unelevated="soundType === 'chime'"
            :outline="soundType !== 'chime'"
            dense
            :disable="!soundEnabled"
            :color="soundType === 'chime' ? 'primary' : 'grey-7'"
            label="🔔 กระดิ่ง"
            class="col q-py-xs apple-pill-btn"
            @click="onSoundTypeChange('chime')"
          >
            <q-tooltip>เสียงกระดิ่งใสๆ กังวาน</q-tooltip>
          </q-btn>
          <q-btn
            size="sm"
            :unelevated="soundType === 'both'"
            :outline="soundType !== 'both'"
            dense
            :disable="!soundEnabled"
            :color="soundType === 'both' ? 'primary' : 'grey-7'"
            label="🔔+🗣️ คู่"
            class="col q-py-xs apple-pill-btn"
            @click="onSoundTypeChange('both')"
          >
            <q-tooltip>เสียงกระดิ่ง + เสียงพูด</q-tooltip>
          </q-btn>
        </div>
      </div>

      <!-- Voice Pattern Selection (Shown when voice or both is active) -->
      <template v-if="soundType === 'voice' || soundType === 'both'">
        <q-separator class="apple-hairline q-my-xs" />

        <div class="column q-gutter-y-xs" :class="{ 'text-muted-light': !soundEnabled }">
          <div class="row items-center justify-between">
            <span class="text-caption text-weight-medium text-body">ข้อความเสียงพูด</span>
            <span
              class="text-caption text-primary text-weight-bold ellipsis"
              style="max-width: 150px"
            >
              {{ previewVoiceSample }}
            </span>
          </div>

          <q-select
            v-model="voicePattern"
            :options="VOICE_PATTERN_OPTIONS"
            emit-value
            map-options
            dense
            outlined
            options-dense
            :disable="!soundEnabled"
            class="full-width apple-select"
            @update:model-value="onVoicePatternChange"
          >
            <template #option="scope">
              <q-item v-bind="scope.itemProps" class="q-py-xs">
                <q-item-section>
                  <q-item-label class="text-weight-bold text-caption">
                    {{ scope.opt.label }}
                  </q-item-label>
                  <q-item-label caption class="text-grey-7">
                    ตัวอย่าง: "{{ scope.opt.example }}"
                  </q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- Custom Voice Text Input -->
          <div v-if="voicePattern === 'custom'" class="q-mt-xs">
            <q-input
              v-model="customVoiceText"
              outlined
              dense
              :disable="!soundEnabled"
              placeholder="เช่น มีออเดอร์ใหม่จ้า หรือ อาหารโต๊ะใหม่"
              class="full-width apple-input"
              hint="พิมพ์ข้อความที่ต้องการให้ระบบพูด"
              @update:model-value="onCustomVoiceTextChange"
            >
              <template #prepend>
                <q-icon name="edit" size="16px" color="primary" />
              </template>
            </q-input>
          </div>

          <!-- Speech Speed Selector -->
          <div class="row items-center justify-between q-mt-xs">
            <span class="text-caption text-weight-medium text-body">ความเร็วเสียง</span>
            <div class="row q-gutter-xs">
              <q-btn
                size="xs"
                :outline="voiceSpeed !== 0.8"
                :unelevated="voiceSpeed === 0.8"
                dense
                :disable="!soundEnabled"
                :color="voiceSpeed === 0.8 ? 'primary' : 'grey-7'"
                label="0.8x ช้า"
                class="apple-pill-btn q-px-sm"
                @click="onVoiceSpeedChange(0.8)"
              />
              <q-btn
                size="xs"
                :outline="voiceSpeed !== 1.0"
                :unelevated="voiceSpeed === 1.0"
                dense
                :disable="!soundEnabled"
                :color="voiceSpeed === 1.0 ? 'primary' : 'grey-7'"
                label="1.0x ปกติ"
                class="apple-pill-btn q-px-sm"
                @click="onVoiceSpeedChange(1.0)"
              />
              <q-btn
                size="xs"
                :outline="voiceSpeed !== 1.2"
                :unelevated="voiceSpeed === 1.2"
                dense
                :disable="!soundEnabled"
                :color="voiceSpeed === 1.2 ? 'primary' : 'grey-7'"
                label="1.2x เร็ว"
                class="apple-pill-btn q-px-sm"
                @click="onVoiceSpeedChange(1.2)"
              />
            </div>
          </div>
        </div>
      </template>

      <q-separator class="apple-hairline q-my-xs" />

      <!-- Volume Slider Section -->
      <div class="column q-gutter-y-xs" :class="{ 'text-muted-light': !soundEnabled }">
        <div class="row items-center justify-between text-caption">
          <span class="text-weight-medium text-body">ระดับความดัง</span>
          <span class="text-weight-bold text-primary font-mono">{{
            soundEnabled ? soundVolume + '%' : 'ปิด'
          }}</span>
        </div>

        <div class="row items-center q-gutter-x-sm no-wrap">
          <q-icon
            name="volume_mute"
            size="18px"
            :color="soundEnabled ? 'grey-7' : 'grey-5'"
          />
          <q-slider
            v-model="soundVolume"
            :min="0"
            :max="100"
            :step="5"
            :disable="!soundEnabled"
            color="primary"
            class="col apple-slider"
            @change="onVolumeChange"
          />
          <q-icon
            name="volume_up"
            size="18px"
            :color="soundEnabled ? 'grey-7' : 'grey-5'"
          />
        </div>

        <!-- Volume Presets -->
        <div class="row q-gutter-xs justify-between q-mt-xs">
          <q-btn
            size="xs"
            outline
            dense
            :disable="!soundEnabled"
            :color="soundVolume === 50 ? 'primary' : 'grey-7'"
            label="50%"
            class="apple-pill-btn q-px-sm"
            @click="setPresetVolume(50)"
          />
          <q-btn
            size="xs"
            outline
            dense
            :disable="!soundEnabled"
            :color="soundVolume === 80 ? 'primary' : 'grey-7'"
            label="80%"
            class="apple-pill-btn q-px-sm"
            @click="setPresetVolume(80)"
          />
          <q-btn
            size="xs"
            outline
            dense
            :disable="!soundEnabled"
            :color="soundVolume === 100 ? 'primary' : 'grey-7'"
            label="100% (ดังสุด)"
            class="apple-pill-btn q-px-sm"
            @click="setPresetVolume(100)"
          />
        </div>
      </div>

      <q-separator class="apple-hairline q-my-xs" />

      <!-- Test Sound Button -->
      <q-btn
        unelevated
        no-caps
        size="md"
        color="primary"
        :icon="soundType === 'voice' ? 'record_voice_over' : 'volume_up'"
        :label="testButtonLabel"
        class="full-width apple-pill-cta text-weight-bold"
        :disable="!soundEnabled"
        @click="testSound"
      />
    </div>
  </q-menu>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useNotify } from 'src/composables/useNotify';
import {
  playNewOrderChime,
  isSoundEnabled,
  setSoundEnabled,
  getSoundVolume,
  setSoundVolume,
  getSoundType,
  setSoundType,
  getVoicePattern,
  setVoicePattern,
  getCustomVoiceText,
  setCustomVoiceText,
  getVoiceSpeed,
  setVoiceSpeed,
  buildSpeechText,
  VOICE_PATTERN_OPTIONS,
  type SoundType,
  type VoicePattern,
} from 'src/utils/audioService';

const { notifySuccess, notifyWarning } = useNotify();

const soundEnabled = ref<boolean>(isSoundEnabled());
const soundVolume = ref<number>(getSoundVolume());
const soundType = ref<SoundType>(getSoundType());
const voicePattern = ref<VoicePattern>(getVoicePattern());
const customVoiceText = ref<string>(getCustomVoiceText());
const voiceSpeed = ref<number>(getVoiceSpeed());

const previewVoiceSample = computed(() => {
  return buildSpeechText(
    voicePattern.value,
    { tableName: 'โต๊ะ 1', queueNumber: 1 },
    customVoiceText.value,
  );
});

const testButtonLabel = computed(() => {
  if (soundType.value === 'chime') return 'ทดสอบเสียงกระดิ่ง (Chime)';
  const sample = previewVoiceSample.value;
  if (soundType.value === 'both') {
    return `ทดสอบกระดิ่ง + "${sample}"`;
  }
  return `ทดสอบเสียงพูด ("${sample}")`;
});

function onSoundToggle(val: boolean) {
  setSoundEnabled(val);
  if (val) {
    testSound();
    notifySuccess({
      title: 'เปิดเสียงแจ้งเตือน 🔊',
      message: 'ระบบจะส่งเสียงเตือนเมื่อมีออเดอร์ใหม่เข้ามา',
    });
  } else {
    notifyWarning({
      title: 'ปิดเสียงแจ้งเตือน 🔇',
      message: 'ระบบจะไม่ส่งเสียงเตือนเมื่อมีออเดอร์ใหม่',
      caption: 'โปรดสังเกตการแจ้งเตือนบนหน้าจออย่างสม่ำเสมอ',
    });
  }
}

function onSoundTypeChange(val: SoundType) {
  soundType.value = val;
  setSoundType(val);
  testSound();
}

function onVoicePatternChange(val: VoicePattern) {
  voicePattern.value = val;
  setVoicePattern(val);
  testSound();
}

function onCustomVoiceTextChange(val: string | number | null) {
  const str = String(val || '');
  customVoiceText.value = str;
  setCustomVoiceText(str);
}

function onVoiceSpeedChange(speed: number) {
  voiceSpeed.value = speed;
  setVoiceSpeed(speed);
  testSound();
}

function onVolumeChange(val: number | null) {
  if (val !== null) {
    setSoundVolume(val);
    testSound();
  }
}

function setPresetVolume(vol: number) {
  soundVolume.value = vol;
  setSoundVolume(vol);
  testSound();
}

function testSound() {
  const sampleContext = {
    tableName: 'โต๊ะ 1',
    queueNumber: 1,
  };
  playNewOrderChime(soundVolume.value, sampleContext);
}
</script>

<style scoped>
.queue-audio-menu {
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--color-hairline, #d2d2d7);
  border-radius: 18px;
  min-width: 330px;
  max-width: 370px;
}

.audio-menu-inner {
  padding: 16px;
}

.text-ink {
  color: var(--color-ink, #1d1d1f);
}

.text-body {
  color: var(--color-body, #414143);
}

.text-muted-light {
  color: var(--color-muted-light, #86868b);
}

.apple-hairline {
  background-color: var(--color-hairline, #d2d2d7);
  opacity: 0.6;
}

.apple-pill-btn {
  border-radius: 980px !important;
  font-weight: 600;
  transition: all 0.18s ease;
}

.apple-pill-cta {
  border-radius: 980px !important;
  height: 40px;
  background: var(--color-primary, #0071e3) !important;
  color: #ffffff !important;
  letter-spacing: 0;
}

.apple-select :deep(.q-field__control) {
  border-radius: 11px !important;
}

.apple-input :deep(.q-field__control) {
  border-radius: 11px !important;
}

.font-mono {
  font-family: var(--app-font-mono, monospace);
  font-variant-numeric: tabular-nums;
}
</style>
