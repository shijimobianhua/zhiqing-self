import {postgresAdapter} from '@payloadcms/db-postgres';
import {buildConfig,type CollectionConfig} from 'payload';
import {secrets,runtimeRoot,cookiePrefix} from './src/server/t3/config.ts';
import path from 'node:path';
const cfg=secrets();
const owner=({req}:{req:{user?:{id?:number|string}|null}})=>!!req.user && String(req.user.id)===String(secrets().ownerId);
const Users:CollectionConfig={slug:'users',labels:{singular:'站主',plural:'站主账户'},auth:{useSessions:true,tokenExpiration:3600,maxLoginAttempts:5,lockTime:900000,cookies:{secure:false,sameSite:'Strict'}},access:{create:()=>false,read:owner,update:owner,delete:()=>false,admin:owner},fields:[]};
// No public Payload REST/GraphQL/first-user routes are mounted.
export default buildConfig({telemetry:false,cookiePrefix,serverURL:cfg.origin,csrf:[cfg.origin],cors:[],collections:[Users],secret:cfg.payloadSecret,db:postgresAdapter({pool:{connectionString:cfg.databaseURL,max:5},schemaName:'auth',push:false,disableCreateDatabase:true}),typescript:{autoGenerate:false,outputFile:path.join(runtimeRoot,'payload-types.ts')}});
