// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v2.7.0
//   protoc               v5.28.3
// source: livekit_metrics.proto

/* eslint-disable */
import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";
import { Timestamp } from "./google/protobuf/timestamp";

export const protobufPackage = "livekit";

/** index from [0: MAX_LABEL_PREDEFINED_MAX_VALUE) are for predefined labels (`MetricLabel`) */
export enum MetricLabel {
  /** AGENTS_LLM_TTFT - time to first token from LLM */
  AGENTS_LLM_TTFT = 0,
  /** AGENTS_STT_TTFT - time to final transcription */
  AGENTS_STT_TTFT = 1,
  /** AGENTS_TTS_TTFB - time to first byte */
  AGENTS_TTS_TTFB = 2,
  /** CLIENT_VIDEO_SUBSCRIBER_FREEZE_COUNT - Number of video freezes */
  CLIENT_VIDEO_SUBSCRIBER_FREEZE_COUNT = 3,
  /** CLIENT_VIDEO_SUBSCRIBER_TOTAL_FREEZE_DURATION - total duration of freezes */
  CLIENT_VIDEO_SUBSCRIBER_TOTAL_FREEZE_DURATION = 4,
  /** CLIENT_VIDEO_SUBSCRIBER_PAUSE_COUNT - number of video pauses */
  CLIENT_VIDEO_SUBSCRIBER_PAUSE_COUNT = 5,
  /** CLIENT_VIDEO_SUBSCRIBER_TOTAL_PAUSES_DURATION - total duration of pauses */
  CLIENT_VIDEO_SUBSCRIBER_TOTAL_PAUSES_DURATION = 6,
  /** CLIENT_AUDIO_SUBSCRIBER_CONCEALED_SAMPLES - number of concealed (synthesized) audio samples */
  CLIENT_AUDIO_SUBSCRIBER_CONCEALED_SAMPLES = 7,
  /** CLIENT_AUDIO_SUBSCRIBER_SILENT_CONCEALED_SAMPLES - number of silent concealed samples */
  CLIENT_AUDIO_SUBSCRIBER_SILENT_CONCEALED_SAMPLES = 8,
  /** CLIENT_AUDIO_SUBSCRIBER_CONCEALMENT_EVENTS - number of concealment events */
  CLIENT_AUDIO_SUBSCRIBER_CONCEALMENT_EVENTS = 9,
  /** CLIENT_AUDIO_SUBSCRIBER_INTERRUPTION_COUNT - number of interruptions */
  CLIENT_AUDIO_SUBSCRIBER_INTERRUPTION_COUNT = 10,
  /** CLIENT_AUDIO_SUBSCRIBER_TOTAL_INTERRUPTION_DURATION - total duration of interruptions */
  CLIENT_AUDIO_SUBSCRIBER_TOTAL_INTERRUPTION_DURATION = 11,
  /** CLIENT_SUBSCRIBER_JITTER_BUFFER_DELAY - total time spent in jitter buffer */
  CLIENT_SUBSCRIBER_JITTER_BUFFER_DELAY = 12,
  /** CLIENT_SUBSCRIBER_JITTER_BUFFER_EMITTED_COUNT - total time spent in jitter buffer */
  CLIENT_SUBSCRIBER_JITTER_BUFFER_EMITTED_COUNT = 13,
  /** CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_BANDWIDTH - total duration spent in bandwidth quality limitation */
  CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_BANDWIDTH = 14,
  /** CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_CPU - total duration spent in cpu quality limitation */
  CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_CPU = 15,
  /** CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_OTHER - total duration spent in other quality limitation */
  CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_OTHER = 16,
  /** PUBLISHER_RTT - Publisher RTT (participant -> server) */
  PUBLISHER_RTT = 17,
  /** SERVER_MESH_RTT - RTT between publisher node and subscriber node (could involve intermedia node(s)) */
  SERVER_MESH_RTT = 18,
  /** SUBSCRIBER_RTT - Subscribe RTT (server -> participant) */
  SUBSCRIBER_RTT = 19,
  METRIC_LABEL_PREDEFINED_MAX_VALUE = 4096,
  UNRECOGNIZED = -1,
}

export function metricLabelFromJSON(object: any): MetricLabel {
  switch (object) {
    case 0:
    case "AGENTS_LLM_TTFT":
      return MetricLabel.AGENTS_LLM_TTFT;
    case 1:
    case "AGENTS_STT_TTFT":
      return MetricLabel.AGENTS_STT_TTFT;
    case 2:
    case "AGENTS_TTS_TTFB":
      return MetricLabel.AGENTS_TTS_TTFB;
    case 3:
    case "CLIENT_VIDEO_SUBSCRIBER_FREEZE_COUNT":
      return MetricLabel.CLIENT_VIDEO_SUBSCRIBER_FREEZE_COUNT;
    case 4:
    case "CLIENT_VIDEO_SUBSCRIBER_TOTAL_FREEZE_DURATION":
      return MetricLabel.CLIENT_VIDEO_SUBSCRIBER_TOTAL_FREEZE_DURATION;
    case 5:
    case "CLIENT_VIDEO_SUBSCRIBER_PAUSE_COUNT":
      return MetricLabel.CLIENT_VIDEO_SUBSCRIBER_PAUSE_COUNT;
    case 6:
    case "CLIENT_VIDEO_SUBSCRIBER_TOTAL_PAUSES_DURATION":
      return MetricLabel.CLIENT_VIDEO_SUBSCRIBER_TOTAL_PAUSES_DURATION;
    case 7:
    case "CLIENT_AUDIO_SUBSCRIBER_CONCEALED_SAMPLES":
      return MetricLabel.CLIENT_AUDIO_SUBSCRIBER_CONCEALED_SAMPLES;
    case 8:
    case "CLIENT_AUDIO_SUBSCRIBER_SILENT_CONCEALED_SAMPLES":
      return MetricLabel.CLIENT_AUDIO_SUBSCRIBER_SILENT_CONCEALED_SAMPLES;
    case 9:
    case "CLIENT_AUDIO_SUBSCRIBER_CONCEALMENT_EVENTS":
      return MetricLabel.CLIENT_AUDIO_SUBSCRIBER_CONCEALMENT_EVENTS;
    case 10:
    case "CLIENT_AUDIO_SUBSCRIBER_INTERRUPTION_COUNT":
      return MetricLabel.CLIENT_AUDIO_SUBSCRIBER_INTERRUPTION_COUNT;
    case 11:
    case "CLIENT_AUDIO_SUBSCRIBER_TOTAL_INTERRUPTION_DURATION":
      return MetricLabel.CLIENT_AUDIO_SUBSCRIBER_TOTAL_INTERRUPTION_DURATION;
    case 12:
    case "CLIENT_SUBSCRIBER_JITTER_BUFFER_DELAY":
      return MetricLabel.CLIENT_SUBSCRIBER_JITTER_BUFFER_DELAY;
    case 13:
    case "CLIENT_SUBSCRIBER_JITTER_BUFFER_EMITTED_COUNT":
      return MetricLabel.CLIENT_SUBSCRIBER_JITTER_BUFFER_EMITTED_COUNT;
    case 14:
    case "CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_BANDWIDTH":
      return MetricLabel.CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_BANDWIDTH;
    case 15:
    case "CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_CPU":
      return MetricLabel.CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_CPU;
    case 16:
    case "CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_OTHER":
      return MetricLabel.CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_OTHER;
    case 17:
    case "PUBLISHER_RTT":
      return MetricLabel.PUBLISHER_RTT;
    case 18:
    case "SERVER_MESH_RTT":
      return MetricLabel.SERVER_MESH_RTT;
    case 19:
    case "SUBSCRIBER_RTT":
      return MetricLabel.SUBSCRIBER_RTT;
    case 4096:
    case "METRIC_LABEL_PREDEFINED_MAX_VALUE":
      return MetricLabel.METRIC_LABEL_PREDEFINED_MAX_VALUE;
    case -1:
    case "UNRECOGNIZED":
    default:
      return MetricLabel.UNRECOGNIZED;
  }
}

export function metricLabelToJSON(object: MetricLabel): string {
  switch (object) {
    case MetricLabel.AGENTS_LLM_TTFT:
      return "AGENTS_LLM_TTFT";
    case MetricLabel.AGENTS_STT_TTFT:
      return "AGENTS_STT_TTFT";
    case MetricLabel.AGENTS_TTS_TTFB:
      return "AGENTS_TTS_TTFB";
    case MetricLabel.CLIENT_VIDEO_SUBSCRIBER_FREEZE_COUNT:
      return "CLIENT_VIDEO_SUBSCRIBER_FREEZE_COUNT";
    case MetricLabel.CLIENT_VIDEO_SUBSCRIBER_TOTAL_FREEZE_DURATION:
      return "CLIENT_VIDEO_SUBSCRIBER_TOTAL_FREEZE_DURATION";
    case MetricLabel.CLIENT_VIDEO_SUBSCRIBER_PAUSE_COUNT:
      return "CLIENT_VIDEO_SUBSCRIBER_PAUSE_COUNT";
    case MetricLabel.CLIENT_VIDEO_SUBSCRIBER_TOTAL_PAUSES_DURATION:
      return "CLIENT_VIDEO_SUBSCRIBER_TOTAL_PAUSES_DURATION";
    case MetricLabel.CLIENT_AUDIO_SUBSCRIBER_CONCEALED_SAMPLES:
      return "CLIENT_AUDIO_SUBSCRIBER_CONCEALED_SAMPLES";
    case MetricLabel.CLIENT_AUDIO_SUBSCRIBER_SILENT_CONCEALED_SAMPLES:
      return "CLIENT_AUDIO_SUBSCRIBER_SILENT_CONCEALED_SAMPLES";
    case MetricLabel.CLIENT_AUDIO_SUBSCRIBER_CONCEALMENT_EVENTS:
      return "CLIENT_AUDIO_SUBSCRIBER_CONCEALMENT_EVENTS";
    case MetricLabel.CLIENT_AUDIO_SUBSCRIBER_INTERRUPTION_COUNT:
      return "CLIENT_AUDIO_SUBSCRIBER_INTERRUPTION_COUNT";
    case MetricLabel.CLIENT_AUDIO_SUBSCRIBER_TOTAL_INTERRUPTION_DURATION:
      return "CLIENT_AUDIO_SUBSCRIBER_TOTAL_INTERRUPTION_DURATION";
    case MetricLabel.CLIENT_SUBSCRIBER_JITTER_BUFFER_DELAY:
      return "CLIENT_SUBSCRIBER_JITTER_BUFFER_DELAY";
    case MetricLabel.CLIENT_SUBSCRIBER_JITTER_BUFFER_EMITTED_COUNT:
      return "CLIENT_SUBSCRIBER_JITTER_BUFFER_EMITTED_COUNT";
    case MetricLabel.CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_BANDWIDTH:
      return "CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_BANDWIDTH";
    case MetricLabel.CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_CPU:
      return "CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_CPU";
    case MetricLabel.CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_OTHER:
      return "CLIENT_VIDEO_PUBLISHER_QUALITY_LIMITATION_DURATION_OTHER";
    case MetricLabel.PUBLISHER_RTT:
      return "PUBLISHER_RTT";
    case MetricLabel.SERVER_MESH_RTT:
      return "SERVER_MESH_RTT";
    case MetricLabel.SUBSCRIBER_RTT:
      return "SUBSCRIBER_RTT";
    case MetricLabel.METRIC_LABEL_PREDEFINED_MAX_VALUE:
      return "METRIC_LABEL_PREDEFINED_MAX_VALUE";
    case MetricLabel.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface MetricsBatch {
  /** time at which this batch is sent based on a monotonic clock (millisecond resolution) */
  timestampMs: string;
  normalizedTimestamp:
    | Date
    | undefined;
  /**
   * To avoid repeating string values, we store them in a separate list and reference them by index
   * This is useful for storing participant identities, track names, etc.
   * There is also a predefined list of labels that can be used to reference common metrics.
   * They have reserved indices from 0 to (METRIC_LABEL_PREDEFINED_MAX_VALUE - 1).
   * Indexes pointing at str_data should start from METRIC_LABEL_PREDEFINED_MAX_VALUE,
   * such that str_data[0] == index of METRIC_LABEL_PREDEFINED_MAX_VALUE.
   */
  strData: string[];
  timeSeries: TimeSeriesMetric[];
  events: EventMetric[];
}

export interface TimeSeriesMetric {
  /**
   * Metric name e.g "speech_probablity". The string value is not directly stored in the message, but referenced by index
   * in the `str_data` field of `MetricsBatch`
   */
  label: number;
  /** index into `str_data` */
  participantIdentity: number;
  /** index into `str_data` */
  trackSid: number;
  samples: MetricSample[];
  /** index into 'str_data' */
  rid: number;
}

export interface MetricSample {
  /** time of metric based on a monotonic clock (in milliseconds) */
  timestampMs: string;
  normalizedTimestamp: Date | undefined;
  value: number;
}

export interface EventMetric {
  label: number;
  /** index into `str_data` */
  participantIdentity: number;
  /** index into `str_data` */
  trackSid: number;
  /** start time of event based on a monotonic clock (in milliseconds) */
  startTimestampMs: string;
  /** end time of event based on a monotonic clock (in milliseconds), if needed */
  endTimestampMs?: string | undefined;
  normalizedStartTimestamp: Date | undefined;
  normalizedEndTimestamp?: Date | undefined;
  metadata: string;
  /** index into 'str_data' */
  rid: number;
}

function createBaseMetricsBatch(): MetricsBatch {
  return { timestampMs: "0", normalizedTimestamp: undefined, strData: [], timeSeries: [], events: [] };
}

export const MetricsBatch: MessageFns<MetricsBatch> = {
  encode(message: MetricsBatch, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.timestampMs !== "0") {
      writer.uint32(8).int64(message.timestampMs);
    }
    if (message.normalizedTimestamp !== undefined) {
      Timestamp.encode(toTimestamp(message.normalizedTimestamp), writer.uint32(18).fork()).join();
    }
    for (const v of message.strData) {
      writer.uint32(26).string(v!);
    }
    for (const v of message.timeSeries) {
      TimeSeriesMetric.encode(v!, writer.uint32(34).fork()).join();
    }
    for (const v of message.events) {
      EventMetric.encode(v!, writer.uint32(42).fork()).join();
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): MetricsBatch {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMetricsBatch();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 8) {
            break;
          }

          message.timestampMs = reader.int64().toString();
          continue;
        }
        case 2: {
          if (tag !== 18) {
            break;
          }

          message.normalizedTimestamp = fromTimestamp(Timestamp.decode(reader, reader.uint32()));
          continue;
        }
        case 3: {
          if (tag !== 26) {
            break;
          }

          message.strData.push(reader.string());
          continue;
        }
        case 4: {
          if (tag !== 34) {
            break;
          }

          message.timeSeries.push(TimeSeriesMetric.decode(reader, reader.uint32()));
          continue;
        }
        case 5: {
          if (tag !== 42) {
            break;
          }

          message.events.push(EventMetric.decode(reader, reader.uint32()));
          continue;
        }
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MetricsBatch {
    return {
      timestampMs: isSet(object.timestampMs) ? globalThis.String(object.timestampMs) : "0",
      normalizedTimestamp: isSet(object.normalizedTimestamp)
        ? fromJsonTimestamp(object.normalizedTimestamp)
        : undefined,
      strData: globalThis.Array.isArray(object?.strData) ? object.strData.map((e: any) => globalThis.String(e)) : [],
      timeSeries: globalThis.Array.isArray(object?.timeSeries)
        ? object.timeSeries.map((e: any) => TimeSeriesMetric.fromJSON(e))
        : [],
      events: globalThis.Array.isArray(object?.events) ? object.events.map((e: any) => EventMetric.fromJSON(e)) : [],
    };
  },

  toJSON(message: MetricsBatch): unknown {
    const obj: any = {};
    if (message.timestampMs !== "0") {
      obj.timestampMs = message.timestampMs;
    }
    if (message.normalizedTimestamp !== undefined) {
      obj.normalizedTimestamp = message.normalizedTimestamp.toISOString();
    }
    if (message.strData?.length) {
      obj.strData = message.strData;
    }
    if (message.timeSeries?.length) {
      obj.timeSeries = message.timeSeries.map((e) => TimeSeriesMetric.toJSON(e));
    }
    if (message.events?.length) {
      obj.events = message.events.map((e) => EventMetric.toJSON(e));
    }
    return obj;
  },

  create(base?: DeepPartial<MetricsBatch>): MetricsBatch {
    return MetricsBatch.fromPartial(base ?? {});
  },
  fromPartial(object: DeepPartial<MetricsBatch>): MetricsBatch {
    const message = createBaseMetricsBatch();
    message.timestampMs = object.timestampMs ?? "0";
    message.normalizedTimestamp = object.normalizedTimestamp ?? undefined;
    message.strData = object.strData?.map((e) => e) || [];
    message.timeSeries = object.timeSeries?.map((e) => TimeSeriesMetric.fromPartial(e)) || [];
    message.events = object.events?.map((e) => EventMetric.fromPartial(e)) || [];
    return message;
  },
};

function createBaseTimeSeriesMetric(): TimeSeriesMetric {
  return { label: 0, participantIdentity: 0, trackSid: 0, samples: [], rid: 0 };
}

export const TimeSeriesMetric: MessageFns<TimeSeriesMetric> = {
  encode(message: TimeSeriesMetric, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.label !== 0) {
      writer.uint32(8).uint32(message.label);
    }
    if (message.participantIdentity !== 0) {
      writer.uint32(16).uint32(message.participantIdentity);
    }
    if (message.trackSid !== 0) {
      writer.uint32(24).uint32(message.trackSid);
    }
    for (const v of message.samples) {
      MetricSample.encode(v!, writer.uint32(34).fork()).join();
    }
    if (message.rid !== 0) {
      writer.uint32(40).uint32(message.rid);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): TimeSeriesMetric {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTimeSeriesMetric();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 8) {
            break;
          }

          message.label = reader.uint32();
          continue;
        }
        case 2: {
          if (tag !== 16) {
            break;
          }

          message.participantIdentity = reader.uint32();
          continue;
        }
        case 3: {
          if (tag !== 24) {
            break;
          }

          message.trackSid = reader.uint32();
          continue;
        }
        case 4: {
          if (tag !== 34) {
            break;
          }

          message.samples.push(MetricSample.decode(reader, reader.uint32()));
          continue;
        }
        case 5: {
          if (tag !== 40) {
            break;
          }

          message.rid = reader.uint32();
          continue;
        }
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): TimeSeriesMetric {
    return {
      label: isSet(object.label) ? globalThis.Number(object.label) : 0,
      participantIdentity: isSet(object.participantIdentity) ? globalThis.Number(object.participantIdentity) : 0,
      trackSid: isSet(object.trackSid) ? globalThis.Number(object.trackSid) : 0,
      samples: globalThis.Array.isArray(object?.samples)
        ? object.samples.map((e: any) => MetricSample.fromJSON(e))
        : [],
      rid: isSet(object.rid) ? globalThis.Number(object.rid) : 0,
    };
  },

  toJSON(message: TimeSeriesMetric): unknown {
    const obj: any = {};
    if (message.label !== 0) {
      obj.label = Math.round(message.label);
    }
    if (message.participantIdentity !== 0) {
      obj.participantIdentity = Math.round(message.participantIdentity);
    }
    if (message.trackSid !== 0) {
      obj.trackSid = Math.round(message.trackSid);
    }
    if (message.samples?.length) {
      obj.samples = message.samples.map((e) => MetricSample.toJSON(e));
    }
    if (message.rid !== 0) {
      obj.rid = Math.round(message.rid);
    }
    return obj;
  },

  create(base?: DeepPartial<TimeSeriesMetric>): TimeSeriesMetric {
    return TimeSeriesMetric.fromPartial(base ?? {});
  },
  fromPartial(object: DeepPartial<TimeSeriesMetric>): TimeSeriesMetric {
    const message = createBaseTimeSeriesMetric();
    message.label = object.label ?? 0;
    message.participantIdentity = object.participantIdentity ?? 0;
    message.trackSid = object.trackSid ?? 0;
    message.samples = object.samples?.map((e) => MetricSample.fromPartial(e)) || [];
    message.rid = object.rid ?? 0;
    return message;
  },
};

function createBaseMetricSample(): MetricSample {
  return { timestampMs: "0", normalizedTimestamp: undefined, value: 0 };
}

export const MetricSample: MessageFns<MetricSample> = {
  encode(message: MetricSample, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.timestampMs !== "0") {
      writer.uint32(8).int64(message.timestampMs);
    }
    if (message.normalizedTimestamp !== undefined) {
      Timestamp.encode(toTimestamp(message.normalizedTimestamp), writer.uint32(18).fork()).join();
    }
    if (message.value !== 0) {
      writer.uint32(29).float(message.value);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): MetricSample {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMetricSample();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 8) {
            break;
          }

          message.timestampMs = reader.int64().toString();
          continue;
        }
        case 2: {
          if (tag !== 18) {
            break;
          }

          message.normalizedTimestamp = fromTimestamp(Timestamp.decode(reader, reader.uint32()));
          continue;
        }
        case 3: {
          if (tag !== 29) {
            break;
          }

          message.value = reader.float();
          continue;
        }
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): MetricSample {
    return {
      timestampMs: isSet(object.timestampMs) ? globalThis.String(object.timestampMs) : "0",
      normalizedTimestamp: isSet(object.normalizedTimestamp)
        ? fromJsonTimestamp(object.normalizedTimestamp)
        : undefined,
      value: isSet(object.value) ? globalThis.Number(object.value) : 0,
    };
  },

  toJSON(message: MetricSample): unknown {
    const obj: any = {};
    if (message.timestampMs !== "0") {
      obj.timestampMs = message.timestampMs;
    }
    if (message.normalizedTimestamp !== undefined) {
      obj.normalizedTimestamp = message.normalizedTimestamp.toISOString();
    }
    if (message.value !== 0) {
      obj.value = message.value;
    }
    return obj;
  },

  create(base?: DeepPartial<MetricSample>): MetricSample {
    return MetricSample.fromPartial(base ?? {});
  },
  fromPartial(object: DeepPartial<MetricSample>): MetricSample {
    const message = createBaseMetricSample();
    message.timestampMs = object.timestampMs ?? "0";
    message.normalizedTimestamp = object.normalizedTimestamp ?? undefined;
    message.value = object.value ?? 0;
    return message;
  },
};

function createBaseEventMetric(): EventMetric {
  return {
    label: 0,
    participantIdentity: 0,
    trackSid: 0,
    startTimestampMs: "0",
    endTimestampMs: undefined,
    normalizedStartTimestamp: undefined,
    normalizedEndTimestamp: undefined,
    metadata: "",
    rid: 0,
  };
}

export const EventMetric: MessageFns<EventMetric> = {
  encode(message: EventMetric, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.label !== 0) {
      writer.uint32(8).uint32(message.label);
    }
    if (message.participantIdentity !== 0) {
      writer.uint32(16).uint32(message.participantIdentity);
    }
    if (message.trackSid !== 0) {
      writer.uint32(24).uint32(message.trackSid);
    }
    if (message.startTimestampMs !== "0") {
      writer.uint32(32).int64(message.startTimestampMs);
    }
    if (message.endTimestampMs !== undefined) {
      writer.uint32(40).int64(message.endTimestampMs);
    }
    if (message.normalizedStartTimestamp !== undefined) {
      Timestamp.encode(toTimestamp(message.normalizedStartTimestamp), writer.uint32(50).fork()).join();
    }
    if (message.normalizedEndTimestamp !== undefined) {
      Timestamp.encode(toTimestamp(message.normalizedEndTimestamp), writer.uint32(58).fork()).join();
    }
    if (message.metadata !== "") {
      writer.uint32(66).string(message.metadata);
    }
    if (message.rid !== 0) {
      writer.uint32(72).uint32(message.rid);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): EventMetric {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEventMetric();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 8) {
            break;
          }

          message.label = reader.uint32();
          continue;
        }
        case 2: {
          if (tag !== 16) {
            break;
          }

          message.participantIdentity = reader.uint32();
          continue;
        }
        case 3: {
          if (tag !== 24) {
            break;
          }

          message.trackSid = reader.uint32();
          continue;
        }
        case 4: {
          if (tag !== 32) {
            break;
          }

          message.startTimestampMs = reader.int64().toString();
          continue;
        }
        case 5: {
          if (tag !== 40) {
            break;
          }

          message.endTimestampMs = reader.int64().toString();
          continue;
        }
        case 6: {
          if (tag !== 50) {
            break;
          }

          message.normalizedStartTimestamp = fromTimestamp(Timestamp.decode(reader, reader.uint32()));
          continue;
        }
        case 7: {
          if (tag !== 58) {
            break;
          }

          message.normalizedEndTimestamp = fromTimestamp(Timestamp.decode(reader, reader.uint32()));
          continue;
        }
        case 8: {
          if (tag !== 66) {
            break;
          }

          message.metadata = reader.string();
          continue;
        }
        case 9: {
          if (tag !== 72) {
            break;
          }

          message.rid = reader.uint32();
          continue;
        }
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skip(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): EventMetric {
    return {
      label: isSet(object.label) ? globalThis.Number(object.label) : 0,
      participantIdentity: isSet(object.participantIdentity) ? globalThis.Number(object.participantIdentity) : 0,
      trackSid: isSet(object.trackSid) ? globalThis.Number(object.trackSid) : 0,
      startTimestampMs: isSet(object.startTimestampMs) ? globalThis.String(object.startTimestampMs) : "0",
      endTimestampMs: isSet(object.endTimestampMs) ? globalThis.String(object.endTimestampMs) : undefined,
      normalizedStartTimestamp: isSet(object.normalizedStartTimestamp)
        ? fromJsonTimestamp(object.normalizedStartTimestamp)
        : undefined,
      normalizedEndTimestamp: isSet(object.normalizedEndTimestamp)
        ? fromJsonTimestamp(object.normalizedEndTimestamp)
        : undefined,
      metadata: isSet(object.metadata) ? globalThis.String(object.metadata) : "",
      rid: isSet(object.rid) ? globalThis.Number(object.rid) : 0,
    };
  },

  toJSON(message: EventMetric): unknown {
    const obj: any = {};
    if (message.label !== 0) {
      obj.label = Math.round(message.label);
    }
    if (message.participantIdentity !== 0) {
      obj.participantIdentity = Math.round(message.participantIdentity);
    }
    if (message.trackSid !== 0) {
      obj.trackSid = Math.round(message.trackSid);
    }
    if (message.startTimestampMs !== "0") {
      obj.startTimestampMs = message.startTimestampMs;
    }
    if (message.endTimestampMs !== undefined) {
      obj.endTimestampMs = message.endTimestampMs;
    }
    if (message.normalizedStartTimestamp !== undefined) {
      obj.normalizedStartTimestamp = message.normalizedStartTimestamp.toISOString();
    }
    if (message.normalizedEndTimestamp !== undefined) {
      obj.normalizedEndTimestamp = message.normalizedEndTimestamp.toISOString();
    }
    if (message.metadata !== "") {
      obj.metadata = message.metadata;
    }
    if (message.rid !== 0) {
      obj.rid = Math.round(message.rid);
    }
    return obj;
  },

  create(base?: DeepPartial<EventMetric>): EventMetric {
    return EventMetric.fromPartial(base ?? {});
  },
  fromPartial(object: DeepPartial<EventMetric>): EventMetric {
    const message = createBaseEventMetric();
    message.label = object.label ?? 0;
    message.participantIdentity = object.participantIdentity ?? 0;
    message.trackSid = object.trackSid ?? 0;
    message.startTimestampMs = object.startTimestampMs ?? "0";
    message.endTimestampMs = object.endTimestampMs ?? undefined;
    message.normalizedStartTimestamp = object.normalizedStartTimestamp ?? undefined;
    message.normalizedEndTimestamp = object.normalizedEndTimestamp ?? undefined;
    message.metadata = object.metadata ?? "";
    message.rid = object.rid ?? 0;
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends { $case: string } ? { [K in keyof Omit<T, "$case">]?: DeepPartial<T[K]> } & { $case: T["$case"] }
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

function toTimestamp(date: Date): Timestamp {
  const seconds = Math.trunc(date.getTime() / 1_000).toString();
  const nanos = (date.getTime() % 1_000) * 1_000_000;
  return { seconds, nanos };
}

function fromTimestamp(t: Timestamp): Date {
  let millis = (globalThis.Number(t.seconds) || 0) * 1_000;
  millis += (t.nanos || 0) / 1_000_000;
  return new globalThis.Date(millis);
}

function fromJsonTimestamp(o: any): Date {
  if (o instanceof globalThis.Date) {
    return o;
  } else if (typeof o === "string") {
    return new globalThis.Date(o);
  } else {
    return fromTimestamp(Timestamp.fromJSON(o));
  }
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}

export interface MessageFns<T> {
  encode(message: T, writer?: BinaryWriter): BinaryWriter;
  decode(input: BinaryReader | Uint8Array, length?: number): T;
  fromJSON(object: any): T;
  toJSON(message: T): unknown;
  create(base?: DeepPartial<T>): T;
  fromPartial(object: DeepPartial<T>): T;
}
