import { fileURLToPath } from 'node:url';
import { outsideSource } from './output-root.ts';
import { runPilot } from '../../src/agentnexus/harness/pilot-run.ts';
const args=process.argv.slice(2);if(args.length!==6||args[0]!=='--output-root'||args[2]!=='--type-tools-root'||args[4]!=='--git-path')throw Error('Use --output-root <independent workspace> --type-tools-root <pinned tools> --git-path <absolute git>');
const source=fileURLToPath(new URL('../../',import.meta.url)),output=await outsideSource(source,args[1]);
const report=await runPilot(output,{type_tools_root:args[3],git_path:args[5],baseline_commit:'78a9d54b96417c262321be35ee44e86e300ca46d'});
console.log(JSON.stringify({root:report.root,status:report.status,model_autonomy:report.model_autonomy,initial_checks:report.initial_checks,final_checks:report.final_checks,coding_peak:report.concurrency.coding_peak,error:report.error}));if(report.status!=='PASS')process.exitCode=1;
