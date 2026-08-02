export type KapsoConfig = {
  apiKey: string;
  phoneNumberId: string;
  businessAccountId?: string;
  webhookSecret?: string;
  apiBaseUrl: string;
};

export type KapsoSendMessageResult = {
  messaging_product: "whatsapp";
  contacts?: Array<{
    input?: string;
    wa_id?: string;
  }>;
  messages: Array<{
    id: string;
  }>;
};

export type KapsoTemplateComponent = {
  type: "body" | "header" | "button";
  sub_type?: string;
  index?: string;
  parameters: Array<
    | {
        type: "text";
        text: string;
        parameter_name?: string;
      }
    | {
        type: "image";
        image: { link: string };
      }
  >;
};

export type KapsoTemplateMessage = {
  name: string;
  language: {
    code: string;
  };
  components?: KapsoTemplateComponent[];
};

export type KapsoTemplateDefinition = {
  name: string;
  language: string;
  category: "UTILITY" | "MARKETING";
  parameter_format: "NAMED";
  components: Array<
    | {
        type: "HEADER";
        format: "IMAGE";
        example: { header_handle: string[] };
      }
    | {
        type: "BODY";
        text: string;
        example?: {
          body_text_named_params: Array<{
            param_name: string;
            example: string;
          }>;
        };
      }
    | {
        type: "FOOTER";
        text: string;
      }
  >;
};

export type KapsoWebhookEvent =
  | "whatsapp.message.received"
  | "whatsapp.message.sent"
  | "whatsapp.message.delivered"
  | "whatsapp.message.read"
  | "whatsapp.message.failed";

export type KapsoProjectWebhookEvent =
  | "whatsapp.phone_number.created"
  | "whatsapp.phone_number.deleted";
