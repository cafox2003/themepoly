import type { CardDefinition } from "./types";

export const CHANCE_DECK: CardDefinition[] = [
  { id: "opportunity-crown", text: "Advance to Crown Avenue.", action: { type: "move_to", target: "BOARDWALK" } },
  { id: "opportunity-go", text: "Advance to GO. Collect $200.", action: { type: "move_to", target: "GO", collectSalary: true } },
  { id: "opportunity-holding", text: "Go directly to holding.", action: { type: "go_to_jail" } },
  { id: "chance-back-3", text: "Go back 3 spaces.", action: { type: "move_relative", spaces: -3 } },
  { id: "opportunity-dividend", text: "The bank pays you a dividend of $50.", action: { type: "collect_bank", amount: 50 } },
  { id: "opportunity-tax", text: "Pay a service fee of $15.", action: { type: "pay_bank", amount: 15 } },
  { id: "opportunity-repairs", text: "Pay each player $25.", action: { type: "pay_players", amount: 25 } },
  { id: "opportunity-card", text: "Get out of holding free.", action: { type: "get_out_of_jail_card" } },
];

export const COMMUNITY_CHEST_DECK: CardDefinition[] = [
  { id: "chest-go", text: "Advance to GO. Collect $200.", action: { type: "move_to", target: "GO", collectSalary: true } },
  { id: "chest-bank-bonus", text: "A bank adjustment is in your favor. Collect $200.", action: { type: "collect_bank", amount: 200 } },
  { id: "chest-doctor", text: "Doctor's fee. Pay $50.", action: { type: "pay_bank", amount: 50 } },
  { id: "chest-holding", text: "Go directly to holding.", action: { type: "go_to_jail" } },
  { id: "chest-sale", text: "From sale of stock you get $50.", action: { type: "collect_bank", amount: 50 } },
  { id: "chest-birthday", text: "Collect $10 from every player.", action: { type: "collect_from_players", amount: 10 } },
  { id: "chest-school", text: "Pay school fees of $50.", action: { type: "pay_bank", amount: 50 } },
  { id: "chest-card", text: "Get out of holding free.", action: { type: "get_out_of_jail_card" } },
];
