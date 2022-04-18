import { createAddress, TestTransactionEvent, MockEthersProvider } from "forta-agent-tools/lib/tests";
import { Finding, HandleTransaction, FindingSeverity, FindingType, TransactionEvent } from "forta-agent";
import { encodeParameter } from "forta-agent-tools";
import agent from "./agent";
import { MAKER_ESM_FIRE_EVENT_SIGNATURE } from "./fire.event";
import { MAKER_ESM_JOIN_EVENT_SIGNATURE } from "./join.event";

const ESM_CONTRACT = createAddress("0xac");
const JOIN_EVENT_ALERTID = "alert-1";
const FIRE_EVENT_ALERTID = "alert-2";

const AMOUNT_3 = "3000000000000000000"; // 3
const AMOUNT_1 = "1000000000000000000"; // 1
const USER = createAddress("0x2");

describe("Agent Handler", () => {
  let handleTransaction: HandleTransaction;

  beforeEach(() => {
    handleTransaction = agent.provideAgentHandler(JOIN_EVENT_ALERTID, FIRE_EVENT_ALERTID, ESM_CONTRACT);
  });

  it("should return Fire event finding", async () => {
    const txEvent: TransactionEvent = new TestTransactionEvent()
      .addEventLog(MAKER_ESM_FIRE_EVENT_SIGNATURE, ESM_CONTRACT)
      .setFrom(USER);

    const findings: Finding[] = await handleTransaction(txEvent);

    expect(findings).toStrictEqual([
      Finding.fromObject({
        name: "Maker ESM Fire Event",
        description: "Fire event emitted.",
        alertId: FIRE_EVENT_ALERTID,
        severity: FindingSeverity.Critical,
        type: FindingType.Suspicious,
        protocol: "Maker",
        metadata: {
          ESM_address: ESM_CONTRACT,
          from: USER,
        },
      }),
    ]);
  });

  it("should return Join event finding", async () => {
    const txEvent: TransactionEvent = new TestTransactionEvent().addEventLog(
      MAKER_ESM_JOIN_EVENT_SIGNATURE,
      ESM_CONTRACT,
      encodeParameter("uint256", AMOUNT_3), // 3
      encodeParameter("address", USER)
    );

    const findings: Finding[] = await handleTransaction(txEvent);

    expect(findings).toStrictEqual([
      Finding.fromObject({
        name: "Maker ESM Join Event",
        description: "Greater than 2 MKR is sent to ESM contract.",
        alertId: JOIN_EVENT_ALERTID,
        protocol: "Maker",
        severity: FindingSeverity.Medium,
        type: FindingType.Suspicious,
        metadata: {
          usr: USER,
          amount: AMOUNT_3,
        },
      }),
    ]);
  });

  it("should return both Join and Fire event findings", async () => {
    const txEvent: TransactionEvent = new TestTransactionEvent()
      .addEventLog(
        MAKER_ESM_JOIN_EVENT_SIGNATURE,
        ESM_CONTRACT,
        encodeParameter("uint256", AMOUNT_3), // 3
        encodeParameter("address", USER)
      )
      .addEventLog(MAKER_ESM_FIRE_EVENT_SIGNATURE, ESM_CONTRACT)
      .setFrom(USER);

    const findings: Finding[] = await handleTransaction(txEvent);

    expect(findings).toStrictEqual([
      Finding.fromObject({
        name: "Maker ESM Join Event",
        description: "Greater than 2 MKR is sent to ESM contract.",
        alertId: JOIN_EVENT_ALERTID,
        protocol: "Maker",
        severity: FindingSeverity.Medium,
        type: FindingType.Suspicious,
        metadata: {
          usr: USER,
          amount: AMOUNT_3,
        },
      }),
      Finding.fromObject({
        name: "Maker ESM Fire Event",
        description: "Fire event emitted.",
        alertId: FIRE_EVENT_ALERTID,
        severity: FindingSeverity.Critical,
        type: FindingType.Suspicious,
        protocol: "Maker",
        metadata: {
          ESM_address: ESM_CONTRACT,
          from: USER,
        },
      }),
    ]);
  });

  it("should return just Join event finding", async () => {
    const txEvent: TransactionEvent = new TestTransactionEvent()
      .addEventLog(
        MAKER_ESM_JOIN_EVENT_SIGNATURE,
        ESM_CONTRACT,
        encodeParameter("uint256", AMOUNT_3), // 3
        encodeParameter("address", USER)
      )
      .addEventLog("BAD SIGNATURE", ESM_CONTRACT)
      .setFrom(USER);

    const findings: Finding[] = await handleTransaction(txEvent);

    expect(findings).toStrictEqual([
      Finding.fromObject({
        name: "Maker ESM Join Event",
        description: "Greater than 2 MKR is sent to ESM contract.",
        alertId: JOIN_EVENT_ALERTID,
        protocol: "Maker",
        severity: FindingSeverity.Medium,
        type: FindingType.Suspicious,
        metadata: {
          usr: USER,
          amount: AMOUNT_3,
        },
      }),
    ]);
  });

  it("should return just Fire event finding", async () => {
    const txEvent: TransactionEvent = new TestTransactionEvent()
      .addEventLog(
        MAKER_ESM_JOIN_EVENT_SIGNATURE,
        ESM_CONTRACT,
        encodeParameter("uint256", AMOUNT_1),
        encodeParameter("address", USER)
      )
      .addEventLog(MAKER_ESM_FIRE_EVENT_SIGNATURE, ESM_CONTRACT)
      .setFrom(USER);

    const findings: Finding[] = await handleTransaction(txEvent);

    expect(findings).toStrictEqual([
      Finding.fromObject({
        name: "Maker ESM Fire Event",
        description: "Fire event emitted.",
        alertId: FIRE_EVENT_ALERTID,
        severity: FindingSeverity.Critical,
        type: FindingType.Suspicious,
        protocol: "Maker",
        metadata: {
          ESM_address: ESM_CONTRACT,
          from: USER,
        },
      }),
    ]);
  });
  it("should return empty finding if address is wrong", async () => {
    const txEvent: TransactionEvent = new TestTransactionEvent()
      .addEventLog(
        MAKER_ESM_JOIN_EVENT_SIGNATURE,
        "0x1", // bad address
        encodeParameter("uint256", AMOUNT_1),
        encodeParameter("address", USER)
      )
      .addEventLog(MAKER_ESM_FIRE_EVENT_SIGNATURE, "0x1")
      .setFrom(USER);

    const findings: Finding[] = await handleTransaction(txEvent);

    expect(findings).toStrictEqual([]);
  });

  it("should return empty finding if signature is wrong", async () => {
    const txEvent: TransactionEvent = new TestTransactionEvent()
      .addEventLog(
        "0xabc", // bad signature
        ESM_CONTRACT,
        encodeParameter("uint256", AMOUNT_1),
        encodeParameter("address", USER)
      )
      .addEventLog("0xabc", ESM_CONTRACT)
      .setFrom(USER);

    const findings: Finding[] = await handleTransaction(txEvent);

    expect(findings).toStrictEqual([]);
  });
});