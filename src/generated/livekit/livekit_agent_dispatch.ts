// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v2.7.0
//   protoc               v5.28.3
// source: livekit_agent_dispatch.proto

/* eslint-disable */
import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";
import { Job } from "./livekit_agent";

export const protobufPackage = "livekit";

export interface CreateAgentDispatchRequest {
  agentName: string;
  room: string;
  metadata: string;
}

export interface RoomAgentDispatch {
  agentName: string;
  metadata: string;
}

export interface DeleteAgentDispatchRequest {
  dispatchId: string;
  room: string;
}

export interface ListAgentDispatchRequest {
  /** if set, only the dispatch whose id is given will be returned */
  dispatchId: string;
  /** name of the room to list agents for. Must be set. */
  room: string;
}

export interface ListAgentDispatchResponse {
  agentDispatches: AgentDispatch[];
}

export interface AgentDispatch {
  id: string;
  agentName: string;
  room: string;
  metadata: string;
  state: AgentDispatchState | undefined;
}

export interface AgentDispatchState {
  /**
   * For dispatches of tyoe JT_ROOM, there will be at most 1 job.
   * For dispatches of type JT_PUBLISHER, there will be 1 per publisher.
   */
  jobs: Job[];
  createdAt: string;
  deletedAt: string;
}

function createBaseCreateAgentDispatchRequest(): CreateAgentDispatchRequest {
  return { agentName: "", room: "", metadata: "" };
}

export const CreateAgentDispatchRequest: MessageFns<CreateAgentDispatchRequest> = {
  encode(message: CreateAgentDispatchRequest, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.agentName !== "") {
      writer.uint32(10).string(message.agentName);
    }
    if (message.room !== "") {
      writer.uint32(18).string(message.room);
    }
    if (message.metadata !== "") {
      writer.uint32(26).string(message.metadata);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): CreateAgentDispatchRequest {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCreateAgentDispatchRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }

          message.agentName = reader.string();
          continue;
        }
        case 2: {
          if (tag !== 18) {
            break;
          }

          message.room = reader.string();
          continue;
        }
        case 3: {
          if (tag !== 26) {
            break;
          }

          message.metadata = reader.string();
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

  fromJSON(object: any): CreateAgentDispatchRequest {
    return {
      agentName: isSet(object.agentName) ? globalThis.String(object.agentName) : "",
      room: isSet(object.room) ? globalThis.String(object.room) : "",
      metadata: isSet(object.metadata) ? globalThis.String(object.metadata) : "",
    };
  },

  toJSON(message: CreateAgentDispatchRequest): unknown {
    const obj: any = {};
    if (message.agentName !== "") {
      obj.agentName = message.agentName;
    }
    if (message.room !== "") {
      obj.room = message.room;
    }
    if (message.metadata !== "") {
      obj.metadata = message.metadata;
    }
    return obj;
  },

  create(base?: DeepPartial<CreateAgentDispatchRequest>): CreateAgentDispatchRequest {
    return CreateAgentDispatchRequest.fromPartial(base ?? {});
  },
  fromPartial(object: DeepPartial<CreateAgentDispatchRequest>): CreateAgentDispatchRequest {
    const message = createBaseCreateAgentDispatchRequest();
    message.agentName = object.agentName ?? "";
    message.room = object.room ?? "";
    message.metadata = object.metadata ?? "";
    return message;
  },
};

function createBaseRoomAgentDispatch(): RoomAgentDispatch {
  return { agentName: "", metadata: "" };
}

export const RoomAgentDispatch: MessageFns<RoomAgentDispatch> = {
  encode(message: RoomAgentDispatch, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.agentName !== "") {
      writer.uint32(10).string(message.agentName);
    }
    if (message.metadata !== "") {
      writer.uint32(18).string(message.metadata);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): RoomAgentDispatch {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRoomAgentDispatch();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }

          message.agentName = reader.string();
          continue;
        }
        case 2: {
          if (tag !== 18) {
            break;
          }

          message.metadata = reader.string();
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

  fromJSON(object: any): RoomAgentDispatch {
    return {
      agentName: isSet(object.agentName) ? globalThis.String(object.agentName) : "",
      metadata: isSet(object.metadata) ? globalThis.String(object.metadata) : "",
    };
  },

  toJSON(message: RoomAgentDispatch): unknown {
    const obj: any = {};
    if (message.agentName !== "") {
      obj.agentName = message.agentName;
    }
    if (message.metadata !== "") {
      obj.metadata = message.metadata;
    }
    return obj;
  },

  create(base?: DeepPartial<RoomAgentDispatch>): RoomAgentDispatch {
    return RoomAgentDispatch.fromPartial(base ?? {});
  },
  fromPartial(object: DeepPartial<RoomAgentDispatch>): RoomAgentDispatch {
    const message = createBaseRoomAgentDispatch();
    message.agentName = object.agentName ?? "";
    message.metadata = object.metadata ?? "";
    return message;
  },
};

function createBaseDeleteAgentDispatchRequest(): DeleteAgentDispatchRequest {
  return { dispatchId: "", room: "" };
}

export const DeleteAgentDispatchRequest: MessageFns<DeleteAgentDispatchRequest> = {
  encode(message: DeleteAgentDispatchRequest, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.dispatchId !== "") {
      writer.uint32(10).string(message.dispatchId);
    }
    if (message.room !== "") {
      writer.uint32(18).string(message.room);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): DeleteAgentDispatchRequest {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDeleteAgentDispatchRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }

          message.dispatchId = reader.string();
          continue;
        }
        case 2: {
          if (tag !== 18) {
            break;
          }

          message.room = reader.string();
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

  fromJSON(object: any): DeleteAgentDispatchRequest {
    return {
      dispatchId: isSet(object.dispatchId) ? globalThis.String(object.dispatchId) : "",
      room: isSet(object.room) ? globalThis.String(object.room) : "",
    };
  },

  toJSON(message: DeleteAgentDispatchRequest): unknown {
    const obj: any = {};
    if (message.dispatchId !== "") {
      obj.dispatchId = message.dispatchId;
    }
    if (message.room !== "") {
      obj.room = message.room;
    }
    return obj;
  },

  create(base?: DeepPartial<DeleteAgentDispatchRequest>): DeleteAgentDispatchRequest {
    return DeleteAgentDispatchRequest.fromPartial(base ?? {});
  },
  fromPartial(object: DeepPartial<DeleteAgentDispatchRequest>): DeleteAgentDispatchRequest {
    const message = createBaseDeleteAgentDispatchRequest();
    message.dispatchId = object.dispatchId ?? "";
    message.room = object.room ?? "";
    return message;
  },
};

function createBaseListAgentDispatchRequest(): ListAgentDispatchRequest {
  return { dispatchId: "", room: "" };
}

export const ListAgentDispatchRequest: MessageFns<ListAgentDispatchRequest> = {
  encode(message: ListAgentDispatchRequest, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.dispatchId !== "") {
      writer.uint32(10).string(message.dispatchId);
    }
    if (message.room !== "") {
      writer.uint32(18).string(message.room);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): ListAgentDispatchRequest {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseListAgentDispatchRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }

          message.dispatchId = reader.string();
          continue;
        }
        case 2: {
          if (tag !== 18) {
            break;
          }

          message.room = reader.string();
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

  fromJSON(object: any): ListAgentDispatchRequest {
    return {
      dispatchId: isSet(object.dispatchId) ? globalThis.String(object.dispatchId) : "",
      room: isSet(object.room) ? globalThis.String(object.room) : "",
    };
  },

  toJSON(message: ListAgentDispatchRequest): unknown {
    const obj: any = {};
    if (message.dispatchId !== "") {
      obj.dispatchId = message.dispatchId;
    }
    if (message.room !== "") {
      obj.room = message.room;
    }
    return obj;
  },

  create(base?: DeepPartial<ListAgentDispatchRequest>): ListAgentDispatchRequest {
    return ListAgentDispatchRequest.fromPartial(base ?? {});
  },
  fromPartial(object: DeepPartial<ListAgentDispatchRequest>): ListAgentDispatchRequest {
    const message = createBaseListAgentDispatchRequest();
    message.dispatchId = object.dispatchId ?? "";
    message.room = object.room ?? "";
    return message;
  },
};

function createBaseListAgentDispatchResponse(): ListAgentDispatchResponse {
  return { agentDispatches: [] };
}

export const ListAgentDispatchResponse: MessageFns<ListAgentDispatchResponse> = {
  encode(message: ListAgentDispatchResponse, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    for (const v of message.agentDispatches) {
      AgentDispatch.encode(v!, writer.uint32(10).fork()).join();
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): ListAgentDispatchResponse {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseListAgentDispatchResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }

          message.agentDispatches.push(AgentDispatch.decode(reader, reader.uint32()));
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

  fromJSON(object: any): ListAgentDispatchResponse {
    return {
      agentDispatches: globalThis.Array.isArray(object?.agentDispatches)
        ? object.agentDispatches.map((e: any) => AgentDispatch.fromJSON(e))
        : [],
    };
  },

  toJSON(message: ListAgentDispatchResponse): unknown {
    const obj: any = {};
    if (message.agentDispatches?.length) {
      obj.agentDispatches = message.agentDispatches.map((e) => AgentDispatch.toJSON(e));
    }
    return obj;
  },

  create(base?: DeepPartial<ListAgentDispatchResponse>): ListAgentDispatchResponse {
    return ListAgentDispatchResponse.fromPartial(base ?? {});
  },
  fromPartial(object: DeepPartial<ListAgentDispatchResponse>): ListAgentDispatchResponse {
    const message = createBaseListAgentDispatchResponse();
    message.agentDispatches = object.agentDispatches?.map((e) => AgentDispatch.fromPartial(e)) || [];
    return message;
  },
};

function createBaseAgentDispatch(): AgentDispatch {
  return { id: "", agentName: "", room: "", metadata: "", state: undefined };
}

export const AgentDispatch: MessageFns<AgentDispatch> = {
  encode(message: AgentDispatch, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.agentName !== "") {
      writer.uint32(18).string(message.agentName);
    }
    if (message.room !== "") {
      writer.uint32(26).string(message.room);
    }
    if (message.metadata !== "") {
      writer.uint32(34).string(message.metadata);
    }
    if (message.state !== undefined) {
      AgentDispatchState.encode(message.state, writer.uint32(42).fork()).join();
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): AgentDispatch {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAgentDispatch();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
          continue;
        }
        case 2: {
          if (tag !== 18) {
            break;
          }

          message.agentName = reader.string();
          continue;
        }
        case 3: {
          if (tag !== 26) {
            break;
          }

          message.room = reader.string();
          continue;
        }
        case 4: {
          if (tag !== 34) {
            break;
          }

          message.metadata = reader.string();
          continue;
        }
        case 5: {
          if (tag !== 42) {
            break;
          }

          message.state = AgentDispatchState.decode(reader, reader.uint32());
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

  fromJSON(object: any): AgentDispatch {
    return {
      id: isSet(object.id) ? globalThis.String(object.id) : "",
      agentName: isSet(object.agentName) ? globalThis.String(object.agentName) : "",
      room: isSet(object.room) ? globalThis.String(object.room) : "",
      metadata: isSet(object.metadata) ? globalThis.String(object.metadata) : "",
      state: isSet(object.state) ? AgentDispatchState.fromJSON(object.state) : undefined,
    };
  },

  toJSON(message: AgentDispatch): unknown {
    const obj: any = {};
    if (message.id !== "") {
      obj.id = message.id;
    }
    if (message.agentName !== "") {
      obj.agentName = message.agentName;
    }
    if (message.room !== "") {
      obj.room = message.room;
    }
    if (message.metadata !== "") {
      obj.metadata = message.metadata;
    }
    if (message.state !== undefined) {
      obj.state = AgentDispatchState.toJSON(message.state);
    }
    return obj;
  },

  create(base?: DeepPartial<AgentDispatch>): AgentDispatch {
    return AgentDispatch.fromPartial(base ?? {});
  },
  fromPartial(object: DeepPartial<AgentDispatch>): AgentDispatch {
    const message = createBaseAgentDispatch();
    message.id = object.id ?? "";
    message.agentName = object.agentName ?? "";
    message.room = object.room ?? "";
    message.metadata = object.metadata ?? "";
    message.state = (object.state !== undefined && object.state !== null)
      ? AgentDispatchState.fromPartial(object.state)
      : undefined;
    return message;
  },
};

function createBaseAgentDispatchState(): AgentDispatchState {
  return { jobs: [], createdAt: "0", deletedAt: "0" };
}

export const AgentDispatchState: MessageFns<AgentDispatchState> = {
  encode(message: AgentDispatchState, writer: BinaryWriter = new BinaryWriter()): BinaryWriter {
    for (const v of message.jobs) {
      Job.encode(v!, writer.uint32(10).fork()).join();
    }
    if (message.createdAt !== "0") {
      writer.uint32(16).int64(message.createdAt);
    }
    if (message.deletedAt !== "0") {
      writer.uint32(24).int64(message.deletedAt);
    }
    return writer;
  },

  decode(input: BinaryReader | Uint8Array, length?: number): AgentDispatchState {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAgentDispatchState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          if (tag !== 10) {
            break;
          }

          message.jobs.push(Job.decode(reader, reader.uint32()));
          continue;
        }
        case 2: {
          if (tag !== 16) {
            break;
          }

          message.createdAt = reader.int64().toString();
          continue;
        }
        case 3: {
          if (tag !== 24) {
            break;
          }

          message.deletedAt = reader.int64().toString();
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

  fromJSON(object: any): AgentDispatchState {
    return {
      jobs: globalThis.Array.isArray(object?.jobs) ? object.jobs.map((e: any) => Job.fromJSON(e)) : [],
      createdAt: isSet(object.createdAt) ? globalThis.String(object.createdAt) : "0",
      deletedAt: isSet(object.deletedAt) ? globalThis.String(object.deletedAt) : "0",
    };
  },

  toJSON(message: AgentDispatchState): unknown {
    const obj: any = {};
    if (message.jobs?.length) {
      obj.jobs = message.jobs.map((e) => Job.toJSON(e));
    }
    if (message.createdAt !== "0") {
      obj.createdAt = message.createdAt;
    }
    if (message.deletedAt !== "0") {
      obj.deletedAt = message.deletedAt;
    }
    return obj;
  },

  create(base?: DeepPartial<AgentDispatchState>): AgentDispatchState {
    return AgentDispatchState.fromPartial(base ?? {});
  },
  fromPartial(object: DeepPartial<AgentDispatchState>): AgentDispatchState {
    const message = createBaseAgentDispatchState();
    message.jobs = object.jobs?.map((e) => Job.fromPartial(e)) || [];
    message.createdAt = object.createdAt ?? "0";
    message.deletedAt = object.deletedAt ?? "0";
    return message;
  },
};

export type AgentDispatchServiceDefinition = typeof AgentDispatchServiceDefinition;
export const AgentDispatchServiceDefinition = {
  name: "AgentDispatchService",
  fullName: "livekit.AgentDispatchService",
  methods: {
    createDispatch: {
      name: "CreateDispatch",
      requestType: CreateAgentDispatchRequest,
      requestStream: false,
      responseType: AgentDispatch,
      responseStream: false,
      options: {},
    },
    deleteDispatch: {
      name: "DeleteDispatch",
      requestType: DeleteAgentDispatchRequest,
      requestStream: false,
      responseType: AgentDispatch,
      responseStream: false,
      options: {},
    },
    listDispatch: {
      name: "ListDispatch",
      requestType: ListAgentDispatchRequest,
      requestStream: false,
      responseType: ListAgentDispatchResponse,
      responseStream: false,
      options: {},
    },
  },
} as const;

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends { $case: string } ? { [K in keyof Omit<T, "$case">]?: DeepPartial<T[K]> } & { $case: T["$case"] }
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

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
