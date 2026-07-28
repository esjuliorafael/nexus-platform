import { apiWhatsApp } from "../../../api";

type KapsoOnboardingTarget =
  | { target: "PRINCIPAL" }
  | { target: "SPECIALIZED"; channelId: number };

const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export async function runKapsoOnboarding(target: KapsoOnboardingTarget) {
  const popup = window.open(
    "",
    "nexus-kapso-onboarding",
    "popup=yes,width=560,height=760",
  );
  if (!popup) {
    throw new Error(
      "El navegador bloqueó la ventana de vinculación. Habilita las ventanas emergentes para Admin.",
    );
  }

  try {
    popup.document.title = "Conectando con Kapso";
    const response = await apiWhatsApp.createKapsoSetupLink({
      ...target,
      returnUrl: window.location.href,
    });
    const { url, sessionId } = response.data;
    popup.location.replace(url);

    for (let attempt = 0; attempt < 150; attempt += 1) {
      await wait(2_000);
      const sessionResponse =
        await apiWhatsApp.getKapsoOnboardingSession(sessionId);
      const session = sessionResponse.data;
      if (session.status === "COMPLETED") {
        popup.close();
        return session;
      }
      if (session.status === "FAILED" || session.status === "EXPIRED") {
        popup.close();
        throw new Error(
          session.errorMessage || "No se completó la vinculación con Kapso.",
        );
      }
    }

    throw new Error(
      "La vinculación continúa pendiente. Puedes revisar el estado más tarde.",
    );
  } catch (error) {
    if (!popup.closed) popup.close();
    throw error;
  }
}
