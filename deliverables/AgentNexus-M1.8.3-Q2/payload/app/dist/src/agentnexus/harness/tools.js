import { invariant, uid } from '../types.js';
import { identityOf, snapshot } from './contracts.js';
export class NativeToolRuntime {
    #state;
    #agents;
    #gateway;
    #run;
    constructor(state, agents, gateway, run) { this.#state = state; this.#agents = agents; this.#gateway = gateway; this.#run = run ?? ((actor, request, signal) => gateway.run(identityOf(actor), request, signal)); }
    preview(actor, request) {
        this.#state.require('native.agent-loop', actor);
        const agent = this.#agents.current(actor);
        const input = snapshot(request);
        const tool = this.#gateway.preview(input);
        const grant = agent.tools.find(g => g.tool_id === tool.id && g.version === tool.version);
        invariant(grant && grant.capability === tool.capability, 'AGENT_TOOL_CAPABILITY');
        if (['BACKGROUND_REVIEWER', 'COORDINATOR', 'RESIDENT'].includes(actor.agent_type))
            invariant(['PURE', 'READ_ONLY'].includes(tool.capability), 'AGENT_READ_ONLY_ROLE');
        invariant(!tool.requires_sandbox && !['PROCESS', 'EXTERNAL_EFFECT'].includes(tool.capability), 'SANDBOX_NOT_VERIFIED');
        if (tool.capability === 'LOCAL_WRITE')
            invariant(typeof input.resource_id === 'string' && grant.resources.includes(input.resource_id) && agent.file_scope.includes(input.resource_id), 'AGENT_RESOURCE_SCOPE');
        else
            invariant(input.resource_id === undefined, 'CAPABILITY_RESOURCE_MISMATCH');
        this.#state.require(tool.feature_id, actor);
        return tool;
    }
    request(actor, name, version, args, resource) {
        const request = { call_id: uid(), tool_id: name, tool_version: version, arguments: snapshot(args), ...(resource ? { resource_id: resource } : {}) };
        this.preview(actor, request);
        return snapshot(request);
    }
    async run(actor, request, signal) { this.preview(actor, request); invariant(!signal?.aborted, 'TASK_CANCEL_REQUESTED'); return this.#run(actor, snapshot(request), signal); }
}
