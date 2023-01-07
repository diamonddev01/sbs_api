export type PublicDirNames = "html" | "css" | "js";

const default_scale = 1;

export function getFileRouteInPublicDir(file_path: string, dir_name: PublicDirNames, downscaled?: number): string {
    const array_size = new Array((downscaled ? downscaled : 0) + default_scale);
    const final_array: string[] = [];

    for(let i = 0; i < array_size.length; i++) {
        final_array.push('../');
    }

    final_array[final_array.length - 1] = "..";

    // return the string
    const dname = dir_name;

    return `${final_array.join('')}/public/${dname}/${file_path}`;
}