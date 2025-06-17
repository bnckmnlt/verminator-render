import type { MqttClient } from "mqtt";

export function handleRelayFeedback(content: string, mqttClient: MqttClient): void {
  if (!content.startsWith("Relay FB:"))
    return;

  const parts = content.slice("Relay FB:".length).split(":");
  if (parts.length !== 3)
    return;

  const [board, pin, state] = parts.map(Number);
  if ([board, pin, state].some(n => Number.isNaN(n)))
    return;

  const topic = `feedback/relay/${board}/${pin}`;
  mqttClient.publish(topic, state.toString(), { qos: 1, retain: true });
}
