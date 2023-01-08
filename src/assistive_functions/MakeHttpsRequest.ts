import request from 'request';

export async function makeRequest<T>(url: string, options: request.CoreOptions, parse: boolean): Promise<{err: any, res: request.Response, body: T}> {
    return new Promise<{err: any, res: request.Response, body: T | any}>((resolve) => {
        request(url, options, (err, res, body) => {
            if(!parse) return resolve({err, res, body});
            return resolve({err, res, body: JSON.parse(body)});
        });
    })
}