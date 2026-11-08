import {TaskBook} from './model.ts';
import type {Status} from './model.ts';
import {summarize} from './analytics.ts';
export function run(args:readonly string[],raw:string|null):{exit_code:number;stdout:string;state:string|null}{
  try {const book=raw===null?new TaskBook():TaskBook.parse(raw),[command,...values]=args;let result:unknown;
    const integer=(x:string|undefined)=>{if(!x||!/^(0|[1-9][0-9]*)$/.test(x)||!Number.isSafeInteger(Number(x)))throw Error('INVALID_NUMBER');return Number(x);};
    if(command==='add'&&values.length===3)result=book.add(values[0],values[1],integer(values[2]));
    else if(command==='advance'&&values.length===3)result=book.advance(values[0],integer(values[1]),values[2] as Status);
    else if(command==='spend'&&values.length===3)result=book.spend(values[0],integer(values[1]),integer(values[2]));
    else if(command==='remove'&&values.length===2){book.remove(values[0],integer(values[1]));result={removed:values[0]};}
    else if(command==='list'&&values.length===0)result=book.list();
    else if(command==='report'&&values.length===0)result=summarize(book.list());
    else throw Error('USAGE: add id title minutes | advance id version status | spend id version minutes | remove id version | list | report');
    return {exit_code:0,stdout:JSON.stringify(result),state:book.serialize()};
  }catch(error){return {exit_code:2,stdout:JSON.stringify({error:error instanceof Error?error.message:'UNKNOWN'}),state:raw};}
}
