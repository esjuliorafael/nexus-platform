import { storePrisma } from "@nexus/db/store";
import bcrypt from "bcrypt";

const userSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  active: true,
  receiveNotifications: true,
  notificationEmail: true,
  createdAt: true,
  contactProfile: {
    include: { channels: { orderBy: [{ sortOrder: "asc" as const }, { id: "asc" as const }] } },
  },
};

export const userService = {
  async getAll() {
    return storePrisma.user.findMany({
      select: userSelect,
    });
  },

  async getById(id: number) {
    return storePrisma.user.findUnique({ where: { id }, select: userSelect });
  },

  async create(data: any) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const { password, ...userData } = data;
    
    return storePrisma.user.create({
      data: {
        ...userData,
        passwordHash,
      },
      select: userSelect,
    });
  },

  async update(id: number, data: any) {
    const { password, ...updateData } = data;
    
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
      updateData.mustChangePassword = true;
    }

    return storePrisma.user.update({
      where: { id },
      data: updateData,
      select: userSelect,
    });
  },

  async delete(id: number) {
    return storePrisma.user.delete({
      where: { id },
    });
  },
};
