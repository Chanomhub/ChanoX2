declare module 'nsfwjs' {
    export interface PredictionType {
        className: 'Drawing' | 'Hentai' | 'Neutral' | 'Porn' | 'Sexy';
        probability: number;
    }

    export interface NSFWJS {
        classify(
            element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
            topk?: number
        ): Promise<PredictionType[]>;
    }

    export function load(pathOrModel?: string | any, options?: { size?: number; type?: string }): Promise<NSFWJS>;

    const nsfwjs: {
        load: typeof load;
    };

    export default nsfwjs;
}
