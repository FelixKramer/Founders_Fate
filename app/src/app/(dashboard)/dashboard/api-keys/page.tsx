"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Key, Plus, Copy, Trash2, Check } from "lucide-react";

const sampleKeys = [
  { id: "1", name: "Production", prefix: "lp_prod_****", created: "Jan 15, 2026", lastUsed: "2 min ago" },
  { id: "2", name: "Development", prefix: "lp_dev_****", created: "Jan 10, 2026", lastUsed: "1 day ago" },
  { id: "3", name: "Staging", prefix: "lp_stg_****", created: "Dec 28, 2025", lastUsed: "3 days ago" },
];

export default function ApiKeysPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyKey = (id: string) => {
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="w-6 h-6 text-emerald-500" />
            API Keys
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage API keys for authenticating with your PostgREST endpoints.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key Name</Label>
                <Input id="key-name" placeholder="e.g., Production" />
              </div>
              <p className="text-xs text-muted-foreground">
                The key will be stored as a hash. Make sure to copy it — you won&apos;t be able to see it again.
              </p>
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                Generate Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                      {key.prefix}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{key.created}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {key.lastUsed}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyKey(key.id)}
                      >
                        {copied === key.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardContent className="pt-6">
          <h3 className="text-sm font-medium mb-2">Use API Keys with PostgREST</h3>
          <pre className="bg-muted/50 border border-border rounded-lg p-3 text-xs font-mono overflow-x-auto">
{`// Include your API key in the Authorization header
const response = await fetch('/rest/todos', {
  headers: {
    'Authorization': 'Bearer lp_prod_your_api_key_here',
    'Content-Type': 'application/json'
  }
});

// Or use the LaunchPad client
const client = new PostgRESTClient({
  baseUrl: '/rest',
  getToken: async () => 'lp_prod_your_api_key_here'
});

const { data } = usePostgRESTQuery(client, 'todos');`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
