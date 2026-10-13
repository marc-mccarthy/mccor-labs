import {
  ApplyGuardrailCommand,
  type BedrockRuntimeClient,
} from '@aws-sdk/client-bedrock-runtime'

interface CheckInput {
  id: string
  version: string
  source: 'INPUT' | 'OUTPUT'
  text: string
}

export async function checkText(
  client: BedrockRuntimeClient,
  { id, version, source, text }: CheckInput,
): Promise<{ blocked: boolean; units: number }> {
  const out = await client.send(
    new ApplyGuardrailCommand({
      guardrailIdentifier: id,
      guardrailVersion: version,
      source,
      content: [{ text: { text } }],
    }),
  )
  const usage = out.usage
  const units =
    (usage?.contentPolicyUnits ?? 0) +
    (usage?.topicPolicyUnits ?? 0) +
    (usage?.wordPolicyUnits ?? 0) +
    (usage?.sensitiveInformationPolicyUnits ?? 0)
  return { blocked: out.action === 'GUARDRAIL_INTERVENED', units }
}
