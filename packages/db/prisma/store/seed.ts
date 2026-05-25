import { PrismaClient } from '@prisma/client-store';

const prisma = new PrismaClient();

const mexicanStates = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Coahuila', 'Colima', 'Ciudad de México', 'Durango', 'Guanajuato',
  'Guerrero', 'Hidalgo', 'Jalisco', 'México', 'Michoacán', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];

async function main() {
  console.log('Seeding Mexican States...');
  
  for (const state of mexicanStates) {
    const existing = await prisma.shippingZone.findFirst({
      where: { state }
    });

    if (!existing) {
      await prisma.shippingZone.create({
        data: {
          state,
          zoneType: 'STANDARD'
        }
      });
      console.log(`Created state: ${state}`);
    } else {
      console.log(`State already exists: ${state}`);
    }
  }
  
  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
