import { RaffleCheckoutClient } from './RaffleCheckoutClient';

export default function RaffleCheckoutPage({ params }: { params: { id: string } }) {
  return <RaffleCheckoutClient raffleId={Number(params.id)} />;
}
