"""Public-file preparation only. Windows handles pin local non-reparse identities.
No certificate, private-key, trust-store, ACL, network, service or elevation API.
"""
import ctypes as c
from ctypes import wintypes as w
import hashlib
import os
from pathlib import Path
import re

K = c.WinDLL('kernel32', use_last_error=True)
K.CreateFileW.argtypes = [w.LPCWSTR,w.DWORD,w.DWORD,c.c_void_p,w.DWORD,w.DWORD,w.HANDLE]
K.CreateFileW.restype = w.HANDLE
K.CreateDirectoryW.argtypes = [w.LPCWSTR,c.c_void_p]
K.CreateDirectoryW.restype = w.BOOL
K.CloseHandle.argtypes = [w.HANDLE]
K.GetDriveTypeW.argtypes = [w.LPCWSTR]
K.ReadFile.argtypes = [w.HANDLE,c.c_void_p,w.DWORD,c.POINTER(w.DWORD),c.c_void_p]
K.WriteFile.argtypes = K.ReadFile.argtypes
K.FlushFileBuffers.argtypes = [w.HANDLE]
K.GetFileSizeEx.argtypes = [w.HANDLE,c.POINTER(c.c_longlong)]
K.SetFilePointerEx.argtypes = [w.HANDLE,c.c_longlong,c.POINTER(c.c_longlong),w.DWORD]

class Info(c.Structure):
    _fields_ = [('attributes',w.DWORD),('created',w.FILETIME),('accessed',w.FILETIME),('written',w.FILETIME),('volume',w.DWORD),('high',w.DWORD),('low',w.DWORD),('links',w.DWORD),('index_high',w.DWORD),('index_low',w.DWORD)]
K.GetFileInformationByHandle.argtypes = [w.HANDLE,c.POINTER(Info)]

def local(value):
    text = str(value)
    if not re.match(r'^[A-Za-z]:[\\/]',text) or ':' in text[2:] or any(ord(ch)<32 for ch in text):
        raise ValueError('LOCAL_ABSOLUTE_PATH_REQUIRED')
    if K.GetDriveTypeW(text[:3]) not in (2,3):
        raise ValueError('LOCAL_DRIVE_REQUIRED')
    return Path(os.path.abspath(text))

class PublicFiles:
    def __init__(self):
        self.directories = {}
        self.outputs = {}
        self.output_root = None
    def _open(self,path,directory=False,write=False):
        access = 0x81 if directory else (0xc0000000 if write else 0x80000000)
        handle = K.CreateFileW(str(path),access,1,None,1 if write else 3,0x02200000 if directory else 0x00200000,None)
        if handle == c.c_void_p(-1).value:
            raise OSError(c.get_last_error(),'LOCAL_FILE_HANDLE_REQUIRED',str(path))
        info = Info()
        if not K.GetFileInformationByHandle(handle,c.byref(info)) or info.attributes & 0x400 or bool(info.attributes & 0x10) != directory:
            K.CloseHandle(handle)
            raise ValueError('LOCAL_NONREPARSE_IDENTITY_REQUIRED')
        return handle
    def pin(self,path):
        path = local(path)
        if path in self.directories: return
        if path.parent != path: self.pin(path.parent)
        self.directories[path] = self._open(path,directory=True)
    def read(self,path,max_bytes=536870912):
        path = local(path); self.pin(path.parent)
        handle = self._open(path)
        try: return b''.join(self.chunks(handle,max_bytes))
        finally: K.CloseHandle(handle)
    def chunks(self,handle,max_bytes=536870912):
        size = c.c_longlong()
        if not K.GetFileSizeEx(handle,c.byref(size)) or size.value<0 or size.value>max_bytes:
            raise ValueError('PUBLIC_FILE_SIZE_REQUIRED')
        if not K.SetFilePointerEx(handle,0,None,0): raise OSError(c.get_last_error(),'SEEK_FAILED')
        remaining = size.value
        buffer = c.create_string_buffer(min(max(remaining,1),4194304))
        while remaining:
            got = w.DWORD()
            if not K.ReadFile(handle,buffer,min(remaining,len(buffer)),c.byref(got),None) or got.value==0:
                raise OSError(c.get_last_error(),'PUBLIC_FILE_TRUNCATED')
            remaining -= got.value
            yield buffer.raw[:got.value]
    def tree(self,root):
        root = local(root); self.pin(root); pending = [root]; files = []
        while pending:
            parent = pending.pop()
            with os.scandir(parent) as entries:
                for entry in entries:
                    path = Path(entry.path)
                    if entry.is_symlink(): raise ValueError('SOURCE_REPARSE_REJECTED')
                    if entry.is_dir(follow_symlinks=False): self.pin(path); pending.append(path)
                    else: files.append(path)
        return sorted(files)
    def create_root(self,path):
        path = local(path); self.pin(path.parent)
        if not K.CreateDirectoryW(str(path),None): raise OSError(c.get_last_error(),'OUTPUT_MUST_BE_NEW',str(path))
        self.pin(path); self.output_root=path
    def mkdir(self,path):
        path = local(path)
        if path in self.directories: return
        if self.output_root not in path.parents: raise ValueError('OUTPUT_ESCAPE')
        self.mkdir(path.parent)
        if not K.CreateDirectoryW(str(path),None): raise OSError(c.get_last_error(),'OUTPUT_DIRECTORY_RACE',str(path))
        self.pin(path)
    def write(self,path,data):
        path = local(path)
        if self.output_root not in path.parents: raise ValueError('OUTPUT_ESCAPE')
        self.mkdir(path.parent)
        handle = self._open(path,write=True)
        self.outputs[path]=(handle,hashlib.sha256(data).hexdigest(),len(data))
        for at in range(0,len(data),4194304):
            block=data[at:at+4194304]; written=w.DWORD()
            if not K.WriteFile(handle,block,len(block),c.byref(written),None) or written.value!=len(block):
                raise OSError(c.get_last_error(),'OUTPUT_WRITE_FAILED')
        if not K.FlushFileBuffers(handle): raise OSError(c.get_last_error(),'OUTPUT_FLUSH_FAILED')
    def digest(self,path): return self.outputs[local(path)][1]
    def size(self,path): return self.outputs[local(path)][2]
    def check(self):
        known_directories=set(self.directories)
        if set(self.tree(self.output_root)) != set(self.outputs): raise ValueError('OUTPUT_FILE_SET_MISMATCH')
        if set(self.directories)!=known_directories: raise ValueError('OUTPUT_EXTRA_DIRECTORY')
        for handle,expected,size in self.outputs.values():
            digest=hashlib.sha256(); total=0
            for block in self.chunks(handle): digest.update(block); total+=len(block)
            if digest.hexdigest()!=expected or total!=size: raise ValueError('OUTPUT_READBACK_MISMATCH')
    def remove_own_marker(self,path):
        path=local(path)
        if path != self.output_root/'preparation-INCOMPLETE.json' or path not in self.outputs: raise ValueError('OWN_MARKER_ONLY')
        handle,_,_=self.outputs.pop(path); K.CloseHandle(handle); path.unlink()
    def close(self):
        for handle,_,_ in self.outputs.values(): K.CloseHandle(handle)
        for handle in self.directories.values(): K.CloseHandle(handle)
        self.outputs.clear(); self.directories.clear()
    def __enter__(self): return self
    def __exit__(self,*args): self.close()
