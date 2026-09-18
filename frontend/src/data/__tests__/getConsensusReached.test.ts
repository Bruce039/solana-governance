import { Connection, PublicKey } from "@solana/web3.js";
import { getConsensusReached } from "../getProposals";
import type { RawProposalAccount } from "@/types";

const key = () => PublicKey.unique();

function proposal(
  overrides: Partial<{
    voting: boolean;
    finalized: boolean;
    consensusResult: PublicKey | null;
  }>,
): RawProposalAccount {
  return {
    publicKey: key(),
    account: {
      voting: true,
      finalized: false,
      consensusResult: key(),
      ...overrides,
    } as unknown as RawProposalAccount["account"],
  };
}

describe("getConsensusReached", () => {
  it("only marks proposals whose ConsensusResult account exists", async () => {
    const reached = proposal({});
    const pending = proposal({});
    const getAccountInfo = jest.fn(async (pk: PublicKey) =>
      pk.equals(reached.account.consensusResult as PublicKey)
        ? { data: Buffer.alloc(8), lamports: 1 }
        : null,
    );
    const connection = { getAccountInfo } as unknown as Connection;

    const result = await getConsensusReached(connection, [reached, pending]);

    expect(result.has(reached.publicKey.toBase58())).toBe(true);
    expect(result.has(pending.publicKey.toBase58())).toBe(false);
    expect(getAccountInfo).toHaveBeenCalledTimes(2);
  });

  it("does not query proposals that cannot be voted on", async () => {
    const getAccountInfo = jest.fn(async () => null);
    const connection = { getAccountInfo } as unknown as Connection;

    const result = await getConsensusReached(connection, [
      proposal({ voting: false }),
      proposal({ finalized: true }),
      proposal({ consensusResult: null }),
    ]);

    expect(result.size).toBe(0);
    expect(getAccountInfo).not.toHaveBeenCalled();
  });
});
