import type { SwaggerTransformObject } from '@fastify/swagger';
import { jsonSchemaTransformObject } from 'fastify-type-provider-zod';

const INPUT_SUFFIX = 'Input';

// The zod provider adds every registered schema as `X` and `XInput`; drop the
// `XInput` components that nothing references (e.g. the response-only Problem).
export const transformObject: SwaggerTransformObject = (documentObject) => {
  const document = jsonSchemaTransformObject(documentObject);
  const components = 'components' in document ? document.components : undefined;
  if (components?.schemas === undefined) {
    return document;
  }

  const text = JSON.stringify(document);
  components.schemas = Object.fromEntries(
    Object.entries(components.schemas).filter(
      ([name]) =>
        !name.endsWith(INPUT_SUFFIX) ||
        text.includes(`"#/components/schemas/${name}"`)
    )
  );
  return document;
};
