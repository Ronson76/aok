import { withRetry, recordSuccess, recordFailure } from "./serviceResilience";

const ECOLOGI_API_BASE = "https://public.ecologi.com";
const ECOLOGI_USERNAME = "nghuman18";

// Test mode - set to true during development/testing to avoid actual tree purchases
// Set to false in production when ready to plant real trees
const ECOLOGI_TEST_MODE = process.env.ECOLOGI_TEST_MODE !== "false";

interface EcologiImpact {
  trees: number;
  carbonOffset: number;
}

interface TreePurchaseResponse {
  amount: number;
  currency: string;
  treeUrl?: string;
  projectDetails?: {
    name: string;
  };
}

export async function getEcologiImpact(): Promise<EcologiImpact | null> {
  try {
    return await withRetry(async () => {
      const response = await fetch(`${ECOLOGI_API_BASE}/users/${ECOLOGI_USERNAME}/impact`);
      if (!response.ok) {
        throw new Error(`Failed to fetch impact: ${response.status}`);
      }
      const data = await response.json() as EcologiImpact;
      recordSuccess("ecologi");
      return data;
    }, { maxAttempts: 2, serviceName: "ecologi", operation: "getEcologiImpact" });
  } catch (error) {
    recordFailure("ecologi", (error as Error).message);
    return null;
  }
}

export async function plantTrees(count: number): Promise<TreePurchaseResponse | null> {
  const apiKey = process.env.ECOLOGI_API_KEY;
  
  // In test mode, simulate success without calling the API
  if (ECOLOGI_TEST_MODE) {
    console.log(`[ECOLOGI] TEST MODE: Would plant ${count} tree(s) - not actually purchasing`);
    return {
      amount: count * 0.20, // Approximate cost
      currency: "GBP",
      treeUrl: "https://ecologi.com/test",
      projectDetails: { name: "Test Project (not real)" }
    };
  }
  
  if (!apiKey) {
    console.error("[ECOLOGI] No API key configured - cannot plant trees");
    return null;
  }
  
  try {
    const response = await fetch(`${ECOLOGI_API_BASE}/impact/trees`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: count,
        test: false,
        units: "trees",
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ECOLOGI] Failed to plant trees:", response.status, errorText);
      return null;
    }
    
    const data = await response.json() as TreePurchaseResponse;
    console.log(`[ECOLOGI] Successfully planted ${count} tree(s):`, data);
    return data;
  } catch (error) {
    console.error("[ECOLOGI] Error planting trees:", error);
    return null;
  }
}

export function isTestMode(): boolean {
  return ECOLOGI_TEST_MODE;
}

export async function purchaseCarbonOffset(kgCO2: number): Promise<any | null> {
  const apiKey = process.env.ECOLOGI_API_KEY;
  
  // In test mode, simulate success without calling the API
  if (ECOLOGI_TEST_MODE) {
    console.log(`[ECOLOGI] TEST MODE: Would offset ${kgCO2}kg CO2 - not actually purchasing`);
    return {
      amount: kgCO2 * 0.015,
      currency: "GBP",
      projectDetails: { name: "Test Carbon Offset (not real)" }
    };
  }
  
  if (!apiKey) {
    console.error("[ECOLOGI] No API key configured - cannot purchase carbon offset");
    return null;
  }
  
  try {
    const response = await fetch(`${ECOLOGI_API_BASE}/impact/carbon`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: kgCO2,
        units: "KG",
        test: false,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ECOLOGI] Failed to purchase carbon offset:", response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    console.log(`[ECOLOGI] Successfully purchased ${kgCO2}kg CO2 offset:`, data);
    return data;
  } catch (error) {
    console.error("[ECOLOGI] Error purchasing carbon offset:", error);
    return null;
  }
}

export async function plantTreeForNewSubscriber(userEmail: string): Promise<boolean> {
  console.log(`[ECOLOGI] Planting tree for new subscriber: ${userEmail}`);
  
  const result = await plantTrees(1);
  
  if (result) {
    console.log(`[ECOLOGI] Tree planted successfully for ${userEmail}`);
    return true;
  }
  
  console.error(`[ECOLOGI] Failed to plant tree for ${userEmail}`);
  return false;
}
