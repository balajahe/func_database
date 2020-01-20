import { BufReader } from 'https://deno.land/std/io/bufio.ts'
import { Document, DBMeta, DBLogger } from './DBMeta.ts'

const read_buf_size = 40960
const chunk_buf_size = 40960

export interface DBReader {
    get_sync?(): Document | false
    get_async?(): Promise<Document | false> 
}   

export class DBReaderSync implements DBReader {
    private file: Deno.File
    private logger?: DBLogger
    private delim: number = DBMeta.delim
    private buf = new Uint8Array(read_buf_size)
    private p1 = 0
    private p2 = -1
    private buf3 = new Uint8Array(chunk_buf_size)
    private p3 = 0
    private decoder = new TextDecoder()

    constructor(fpath: string, logger?: DBLogger) {
        this.file = Deno.openSync(fpath, 'r')
        this.logger = logger
    }

    get_sync(): Document | false {
        let res_a: Uint8Array
        while (this.p2 > -1 || this.read_buf()) {
            this.p2 = this.buf.indexOf(this.delim, this.p1)
            if (this.p2 > -1) {
                if (this.p3 === 0) {
                    res_a = this.buf.subarray(this.p1, this.p2)
                    this.p1 =  this.p2 + 1
                    break
                } else {
                    const b = this.buf.slice(this.p1, this.p2)
                    this.buf3.set(b, this.p3)
                    this.p3 += b.length
                    res_a = this.buf3.subarray(0, this.p3)
                    this.p1 =  this.p2 + 1
                    this.p3 = 0
                    break
                }
            } else {
                const b = this.buf.slice(this.p1)
                this.buf3.set(b, this.p3)
                this.p3 += b.length
            }
        }
        switch (res_a) {
            case undefined:
                this.file.close()
                return false
            default:
                const res_s = this.decoder.decode(res_a)
                this.logger?.inc_total()
                try {
                    const res_o = JSON.parse(res_s)
                    this.logger?.inc_parsed()
                    return res_o
                } catch(e) {
                    console.log(res_s + '\n' + e)
                    return this.get_sync()
                }
        }
    }

    private read_buf(): boolean {
        this.p1 = 0
        const cou = this.file.readSync(this.buf)
        switch (cou) {
            case read_buf_size:
                return true
            case Deno.EOF:
                return false
            default:
                this.buf = this.buf.slice(0, cou)
                return true
        }
    }
}

export class DBReaderAsync implements DBReader {
    private file: Deno.File
    private logger?: DBLogger
    private delim: string = String.fromCharCode(DBMeta.delim)
    private reader: BufReader

    constructor(fpath: string, logger?: DBLogger) {
        this.file = Deno.openSync(fpath, 'r')
        this.logger = logger
        this.reader = new BufReader(this.file, read_buf_size)
    }

    async get_async(): Promise<Document | false> {
        let res_s = await this.reader.readString(this.delim)
        switch (res_s) {
            case Deno.EOF:
                this.file.close()
                return false
            default: 
                res_s = res_s.slice(0,-1)
                this.logger?.inc_total()
                try {
                    const res_o = JSON.parse(res_s)
                    this.logger?.inc_parsed()
                    return res_o
                } catch(e) {
                    console.log(res_s + '\n' + e)
                    return await this.get_async()
                }
        }
    } 
}