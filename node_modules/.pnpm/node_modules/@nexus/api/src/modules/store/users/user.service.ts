import { storePrisma } from "@nexus/db/store";
import bcrypt from "bcrypt";

export const userService = {
  async getAll() {
    return storePrisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
        receiveNotifications: true,
        createdAt: true,
      },
    });
  },

  async create(data: any) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const { password, ...userData } = data;
    
    return storePrisma.user.create({
      data: {
        ...userData,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
        receiveNotifications: true,
      },
    });
  },

  async update(id: number, data: any) {
    return storePrisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
        receiveNotifications: true,
      },
    });
  },

  async delete(id: number) {
    return storePrisma.user.delete({
      where: { id },
    });
  },
};
