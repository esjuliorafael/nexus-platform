import assert from "node:assert/strict";
import test from "node:test";
import { requireAdminActor } from "../src/utils/admin-authorization";

const request = {
  user: { id: 7 },
  ip: "127.0.0.1",
  id: "request-1",
  headers: { "user-agent": "Nexus test" },
} as any;

const createReply = () => {
  const state = { statusCode: 200, payload: null as unknown };
  return {
    state,
    reply: {
      status(code: number) {
        state.statusCode = code;
        return this;
      },
      send(payload: unknown) {
        state.payload = payload;
        return this;
      },
    } as any,
  };
};

test("accepts active administrators and captures their audit identity", async () => {
  const server = {
    storePrisma: {
      user: {
        findUnique: async () => ({
          id: 7,
          name: "Julio Rafael",
          role: "ADMIN",
          active: true,
        }),
      },
    },
  } as any;
  const { reply } = createReply();

  const actor = await requireAdminActor(server, request, reply);

  assert.deepEqual(actor, {
    type: "USER",
    userId: 7,
    name: "Julio Rafael",
    role: "ADMIN",
    origin: "ADMIN",
    ipAddress: "127.0.0.1",
    userAgent: "Nexus test",
    requestId: "request-1",
  });
});

test("rejects staff members even when their JWT is valid", async () => {
  const server = {
    storePrisma: {
      user: {
        findUnique: async () => ({
          id: 7,
          name: "Colaborador",
          role: "STAFF",
          active: true,
        }),
      },
    },
  } as any;
  const { reply, state } = createReply();

  const actor = await requireAdminActor(server, request, reply);

  assert.equal(actor, null);
  assert.equal(state.statusCode, 403);
});

test("rejects inactive administrative accounts", async () => {
  const server = {
    storePrisma: {
      user: {
        findUnique: async () => ({
          id: 7,
          name: "Administrador",
          role: "SUPERADMIN",
          active: false,
        }),
      },
    },
  } as any;
  const { reply, state } = createReply();

  const actor = await requireAdminActor(server, request, reply);

  assert.equal(actor, null);
  assert.equal(state.statusCode, 403);
});
