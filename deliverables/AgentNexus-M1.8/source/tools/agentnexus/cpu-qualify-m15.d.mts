export type CpuObservation={job_user_cpu_100ns:string;job_kernel_cpu_100ns:string;job_cpu_rate:number;root_exit_observed:boolean;tree_empty_observed:boolean;termination_requested_at:string|null;termination_reason:string|null;job_cpu_time_scope:string;job_cpu_time_end_action:string};
export type CpuAdjudication={status:'PASS'|'FAIL';budget_ms:number;tolerance_ms:number;job_user_cpu_ms:number;job_kernel_cpu_ms:number;cpu_rate:number;wall_termination:string|null;budget_observed:boolean;kernel_cpu_bounded:false;assurance:'REAL_WINDOWS_PRIMITIVE';production_guarantee:false};
export function adjudicateCpu(observation:CpuObservation,budgetMs:number):CpuAdjudication;
export function qualifyCpu(outputRoot:string):Promise<unknown>;
