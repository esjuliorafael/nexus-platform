import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client-store";
import { storePrisma } from "@nexus/db/store";

const contactInclude = {
  channels: { orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }] },
};

function conflict(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 409;
  return error;
}

function unauthorized(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 401;
  return error;
}

function serializeContactProfile(profile: any, fallbackName?: string) {
  if (!profile) return null;
  return {
    id: profile.id,
    displayName: profile.displayName || fallbackName || "",
    responsibility: profile.responsibility,
    description: profile.description,
    scheduleText: profile.scheduleText,
    published: profile.published,
    sortOrder: profile.sortOrder,
    channels: profile.channels.map((channel: any) => ({
      id: channel.id,
      type: channel.type,
      phoneNumber: channel.phoneNumber,
      label: channel.label,
      active: channel.active,
      sortOrder: channel.sortOrder,
    })),
  };
}

export const profileService = {
  async getOwnProfile(userId: number) {
    const user = await storePrisma.user.findUnique({
      where: { id: userId },
      include: { contactProfile: { include: contactInclude } },
    });
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      active: user.active,
      mustChangePassword: user.mustChangePassword,
      receiveNotifications: user.receiveNotifications,
      notificationEmail: user.notificationEmail,
      contactProfile: serializeContactProfile(user.contactProfile, user.name),
    };
  },

  async updateOwnProfile(userId: number, data: any) {
    try {
      await storePrisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          username: data.username,
          email: data.email || null,
          phone: data.phone || null,
        },
      });
      return this.getOwnProfile(userId);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw conflict("Ese nombre de usuario ya esta en uso.");
      }
      throw error;
    }
  },

  async updateOwnNotifications(userId: number, data: any) {
    await storePrisma.user.update({
      where: { id: userId },
      data: {
        receiveNotifications: data.receiveNotifications,
        notificationEmail: data.notificationEmail || null,
      },
    });
    return this.getOwnProfile(userId);
  },

  async updateContactProfile(userId: number, data: any, canPublish: boolean) {
    const current = await storePrisma.contactProfile.findUnique({ where: { userId } });
    const published = canPublish
      ? (data.published ?? current?.published ?? false)
      : (current?.published ?? false);

    await storePrisma.$transaction(async (tx) => {
      const profile = await tx.contactProfile.upsert({
        where: { userId },
        create: {
          userId,
          displayName: data.displayName || null,
          responsibility: data.responsibility,
          description: data.description || null,
          scheduleText: data.scheduleText || null,
          published,
          sortOrder: data.sortOrder ?? 0,
        },
        update: {
          displayName: data.displayName || null,
          responsibility: data.responsibility,
          description: data.description || null,
          scheduleText: data.scheduleText || null,
          published,
          ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        },
      });

      await tx.contactChannel.deleteMany({ where: { contactProfileId: profile.id } });
      if (data.channels.length > 0) {
        await tx.contactChannel.createMany({
          data: data.channels.map((channel: any, index: number) => ({
            contactProfileId: profile.id,
            type: channel.type,
            phoneNumber: channel.phoneNumber,
            label: channel.label || null,
            active: channel.active,
            sortOrder: index,
          })),
        });
      }
    });

    return this.getOwnProfile(userId);
  },

  async changeOwnPassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await storePrisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw unauthorized("La contrasena actual no es correcta.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await storePrisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    return { success: true };
  },

  async getPublicContacts() {
    const profiles = await storePrisma.contactProfile.findMany({
      where: {
        published: true,
        user: { active: true },
        channels: { some: { active: true } },
      },
      include: {
        user: { select: { name: true } },
        channels: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    return profiles.map((profile) => ({
      id: profile.id,
      displayName: profile.displayName || profile.user.name,
      responsibility: profile.responsibility,
      description: profile.description,
      scheduleText: profile.scheduleText,
      channels: profile.channels.map((channel) => ({
        id: channel.id,
        type: channel.type,
        phoneNumber: channel.phoneNumber,
        label: channel.label,
      })),
    }));
  },
};

