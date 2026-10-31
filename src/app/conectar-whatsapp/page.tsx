
"use client";

import { useEffect, useState } from "react";

const APP_ID = "1863802998151573";
const CONFIG_ID = "2301528167308866";

declare global {
  interface Window {
    FB?: {
      init: (options: Record<string, unknown>) => void;
      login: (
        callback: (response: {
          authResponse?: { code?: string };
          status?: string;
        }) => void,
        options: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export default function ConectarWhatsApp() {
  const [pronto, setPronto] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: APP_ID,
        cookie: true,
        xfbml: true,
        version: "v26.0",
      });
      setPronto(true);
    };

    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/pt_BR/sdk.js";
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      window.fbAsyncInit = undefined;
    };
  }, []);

  function conectar() {
    if (!window.FB) {
      setMensagem("A conexão com a Meta ainda não carregou.");
      return;
    }

    setMensagem("Aguardando autorização da Meta...");

    window.FB.login(
      (response) => {
        if (response.authResponse?.code) {
          setMensagem(
            "Autorização recebida. A conexão ainda precisa ser finalizada no servidor."
          );
          console.log(
            "Código de autorização recebido:",
            Boolean(response.authResponse.code)
          );
        } else {
          setMensagem(
            "A conexão não foi concluída. Verifique a janela da Meta."
          );
        }
      },
      {
        config_id: CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      }
    );
  }

  return (
    <main style={{ padding: 40, textAlign: "center" }}>
      <h1>Conectar WhatsApp Business</h1>

      <p>
        Conecte o WhatsApp do Edinho ao sistema
        Edinho Chaves Tattoo Pro.
      </p>

      <button
        type="button"
        onClick={conectar}
        disabled={!pronto}
        style={{
          padding: "14px 24px",
          borderRadius: 8,
          backgroundColor: "#16803c",
          color: "white",
          cursor: pronto ? "pointer" : "not-allowed",
          opacity: pronto ? 1 : 0.6,
        }}
      >
        {pronto ? "Conectar com a Meta" : "Carregando Meta..."}
      </button>

      <p style={{ marginTop: 20 }}>{mensagem}</p>
    </main>
  );
}
