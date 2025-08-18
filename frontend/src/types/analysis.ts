export interface AnalysisItem {
    analysis_id: string;
    global_fs: string; // "[mm:ss]"
    speaker: string;
    analysis_type: "affirmation" | "definition" | "attack" | "defence" | "example";
    content: string;
    technique?: string;
    target?: string;
    base?: string; // 新增
    goal?: string;
    interruption_type?: string;
    pros_gain?: number | string; // 新增
    cons_gain?: number | string; // 新增
    summary?: string; // 新增
}

export interface AnalysisData {
    analysis: AnalysisItem[];
}