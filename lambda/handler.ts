import { handleBookGenerationSQSEvent } from '@/lib/ai/worker/awsBookGenerationHandler';

export const handler = handleBookGenerationSQSEvent;
