import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {SECURITY_FEATURES,CLASSIFICATIONS,defaultProfile} from '../../src/agentnexus/security/profile.ts';
const root=fileURLToPath(new URL('../../',import.meta.url)),folder=join(root,'config/agentnexus/security');await mkdir(folder,{recursive:true});
const levels={enum:['OFF','ADVISORY','ENFORCED']};
const object=(properties:Record<string,unknown>)=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const features=object(Object.fromEntries(SECURITY_FEATURES.map(d=>[d.id,d.fixed?{const:true}:{type:'boolean'}])));
const partialFeatures=(properties:Record<string,unknown>)=>({properties:{features:{properties,required:Object.keys(properties)}},required:['features']});
const levelAt=(part:'policy'|'dataEgress',level:unknown)=>({properties:{[part]:{properties:{enforcement:level},required:['enforcement']}},required:[part]});
const enabled=(key:string)=>partialFeatures({[key]:{const:true}});
const disabled=(key:string)=>partialFeatures({[key]:{const:false}});
const schema={$schema:'https://json-schema.org/draft/2020-12/schema',$id:'https://agentnexus.local/schemas/security-profile-v1.json',title:'AgentNexus Security Profile v1',...object({
  version:{const:1},mode:{enum:['LOCAL_DEVELOPMENT_MODE','HARDENED_DEPLOYMENT_MODE']},features,
  policy:object({enforcement:levels,advisoryConfirmation:{type:'boolean'}}),
  dataEgress:object({enforcement:levels,classification:{enum:CLASSIFICATIONS},defaultDecision:{enum:['ALLOW','DENY']},scopes:{type:'array',maxItems:128,uniqueItems:true,items:object({scope:{enum:['PROVIDER','PROJECT','AGENT']},id:{type:'string',pattern:'^[A-Za-z0-9_.:-]{1,128}$'},classification:{enum:CLASSIFICATIONS},decision:{enum:['ALLOW','DENY','APPROVAL']}})}}),
  budgets:object(Object.fromEntries(Object.keys(defaultProfile().budgets).map(id=>[id,{type:'integer',minimum:1,maximum:id.endsWith('Tokens')?100000000:id==='requestsPerMinute'?1000000:Number.MAX_SAFE_INTEGER}]))),
}),allOf:[
  {if:enabled('policy.enforcement'),then:levelAt('policy',{enum:['ADVISORY','ENFORCED']}),else:levelAt('policy',{const:'OFF'})},
  {if:disabled('policy.engine'),then:levelAt('policy',{const:'OFF'})},
  {if:enabled('data.egress'),then:{allOf:[enabled('data.classification'),levelAt('dataEgress',{enum:['ADVISORY','ENFORCED']})]},else:levelAt('dataEgress',{const:'OFF'})},
  {if:enabled('policy.approval'),then:enabled('execution.fileWriteApproval'),else:disabled('execution.fileWriteApproval')},
  {not:partialFeatures({'credentials.osStorage':{const:true},'credentials.isolatedService':{const:true}})},
  {if:{properties:{mode:{const:'HARDENED_DEPLOYMENT_MODE'}}},then:{allOf:[enabled('credentials.isolatedService'),disabled('credentials.osStorage'),levelAt('policy',{const:'ENFORCED'}),levelAt('dataEgress',{const:'ENFORCED'}),...['deployment.osQualification','deployment.runtimeIsolation','policy.defaultDeny','policy.approval','audit.commands','audit.tools','audit.providers','audit.policy'].map(enabled)]}},
],$comment:'Runtime semantic validation additionally rejects duplicate (scope,id), profile over 65536 bytes, unknown feature IDs, unavailable guard text changes and unapproved/stale changes. Version 0 migration is explicit via trusted import.'};
const files:Record<string,unknown>={'security-profile.schema.json':schema,'feature-registry.json':{schema:'agentnexus/security-feature-registry/1',features:SECURITY_FEATURES},'dependency-graph.json':{schema:'agentnexus/security-dependencies/1',nodes:SECURITY_FEATURES.map(f=>f.id),edges:SECURITY_FEATURES.flatMap(f=>f.dependencies.map(id=>({from:id,to:f.id})))},'local-default.json':defaultProfile(),'hardened-default.json':defaultProfile('HARDENED_DEPLOYMENT_MODE')};
for(const [name,body]of Object.entries(files))await writeFile(join(folder,name),JSON.stringify(body,null,2)+'\n');
process.stdout.write(`Generated ${Object.keys(files).length} security contracts for ${SECURITY_FEATURES.length} features.\n`);
